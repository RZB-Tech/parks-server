import assert from "node:assert/strict";
import { test, TestContext } from "node:test";
import fastify from "fastify";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { AuditLogModel, EmployeeModel, RoleModel } from "../src/plugins/db/postgresql/db";
import AuditLogsRouter from "../src/routes/audit-log-routes/AuditLogRoutes";
import { corsConfigs } from "../src/plugins/cors";
import { AuditActionTypes } from "../src/models/postgresql/audit-log-model/enums";
import { getAuditExportRange } from "../src/utils/auditExportRange";

const secret = "audit-export-test-secret";
const endpoint = "/api/v1/audit-logs/export";
const dayQuery = { from: "2026-10-12", to: "2026-10-12" };

const fixture = (id: number, overrides: Record<string, unknown> = {}) => ({
  id: String(id),
  employee_id: "7",
  employee_name: "Sinov xodimi — Тест",
  employee_role: "admin",
  action: AuditActionTypes.UPDATE,
  entity_type: "cards",
  entity_id: "15",
  old_values: { balance: 0 },
  new_values: { balance: 1000, nested: { valid: true } },
  route: "/api/v1/cards/15",
  method: "PATCH",
  ip_address: "127.0.0.1",
  user_agent: null,
  created_at: new Date("2026-10-12T10:00:00Z"),
  ...overrides,
});

// Execute Sequelize where conditions against fixtures so range, cursor and
// visibility mistakes change the exported records, rather than just mock calls.
const matches = (row: any, where: any): boolean =>
  Reflect.ownKeys(where).every((key) => {
    const condition = where[key];
    if (key === Op.and) return condition.every((entry: any) => matches(row, entry));
    if (key === Op.or) return condition.some((entry: any) => matches(row, entry));
    if (key === Op.not) return !matches(row, condition);

    const value = row[key];
    if (condition instanceof Date) return +value === +condition;
    if (condition === null || typeof condition !== "object") return value === condition;

    return Reflect.ownKeys(condition).every((operator) => {
      const expected = condition[operator];
      if (operator === Op.ne) return value !== expected;
      if (operator === Op.in) return expected.includes(value);
      const left = key === "id" ? BigInt(value) : +value;
      const right = key === "id" ? BigInt(expected) : +expected;
      if (operator === Op.gte) return left >= right;
      if (operator === Op.lt) return left < right;
      throw new Error(`Unsupported fixture operator: ${String(operator)}`);
    });
  });

const setup = async (t: TestContext, records: any[] = []) => {
  const queries: any[] = [];
  t.mock.method(RoleModel, "findOne", async (options: any) => {
    if (options.where.name === "owner") return { id: 2 } as any;
    return { id: options.where.id, name: options.where.id } as any;
  });
  t.mock.method(EmployeeModel, "findOne", async (options: any) => ({
    id: options.where.id,
    role: options.where.id,
    firstname: "Test",
    lastname: "Employee",
  }) as any);
  t.mock.method(EmployeeModel, "findAll", async (options: any) => {
    assert.equal(options.paranoid, false);
    return [{ id: 99 }] as any;
  });
  t.mock.method(AuditLogModel, "findAll", async (options: any) => {
    queries.push(options);
    assert.equal(options.offset, undefined);
    assert.equal(options.limit, 500);
    return records
      .filter((row) => matches(row, options.where))
      .sort((a, b) => +b.created_at - +a.created_at || Number(BigInt(b.id) - BigInt(a.id)))
      .slice(0, options.limit)
      .map((row) => ({ ...row, get: () => row })) as any;
  });

  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const app = fastify();
  app.register(require("@fastify/cors"), corsConfigs);
  app.register(AuditLogsRouter, { prefix: "/api/v1" });
  t.after(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const headers = (role = "admin") => ({
    authorization: `Bearer ${jwt.sign({ employee_id: role, token_type: "access" }, secret, { expiresIn: "1h" })}`,
  });
  return { app, headers, queries };
};

test("audit export includes both Tashkent days and validates precise time ranges", () => {
  const day = getAuditExportRange(dayQuery);
  assert.equal(day.start.toISOString(), "2026-10-11T19:00:00.000Z");
  assert.equal(day.end.toISOString(), "2026-10-12T19:00:00.000Z");

  const exact = getAuditExportRange({
    from: "2026-10-12T09:00:00+05:00",
    to: "2026-10-12T10:00:00+05:00",
  });
  assert.equal(exact.start.toISOString(), "2026-10-12T04:00:00.000Z");
  assert.equal(exact.end.toISOString(), "2026-10-12T05:00:00.000Z");
});

test("audit export downloads JSON with correct dates and existing owner visibility", async (t) => {
  const { app, headers, queries } = await setup(t, [
    fixture(1, { created_at: new Date("2026-10-11T18:59:59.999Z") }),
    fixture(2, { created_at: new Date("2026-10-11T19:00:00Z") }),
    fixture(3, { created_at: new Date("2026-10-12T18:59:59.999Z") }),
    fixture(4, { created_at: new Date("2026-10-12T19:00:00Z") }),
    fixture(5, { employee_role: "owner" }),
    fixture(6, { entity_type: "employees", entity_id: "99" }),
  ]);
  const response = await app.inject({
    method: "GET", url: endpoint, query: dayQuery,
    headers: { ...headers(), origin: "https://frontend.example" },
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"]!, /^application\/json; charset=utf-8$/);
  assert.equal(response.headers["content-disposition"], 'attachment; filename="audit-logs_2026-10-12_2026-10-12.json"');
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["access-control-expose-headers"], "Content-Disposition");
  const data = response.json();
  assert.equal(data.from, dayQuery.from);
  assert.equal(data.to, dayQuery.to);
  assert.ok(!Number.isNaN(Date.parse(data.exported_at)));
  assert.deepEqual(data.audit_logs.map((row: any) => row.id), [3, 2]);
  assert.equal(data.audit_logs[0].employee.name, "Sinov xodimi — Тест");
  assert.deepEqual(data.audit_logs[0].new_values, { balance: 1000, nested: { valid: true } });
  assert.equal(data.audit_logs[0].user_agent, null);
  assert.equal(data.data, undefined);
  assert.equal(queries.length, 1);
});

test("audit export streams all batches without duplicates at identical timestamps", async (t) => {
  const records = Array.from({ length: 1007 }, (_, index) => fixture(index + 1));
  // Cross both the timestamp and ID cursor boundaries.
  records[0].created_at = new Date("2026-10-12T09:00:00Z");
  const { app, headers, queries } = await setup(t, records);
  const response = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: headers() });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().audit_logs.map((row: any) => row.id),
    Array.from({ length: 1007 }, (_, index) => 1007 - index));
  assert.equal(queries.length, 3);
});

test("audit export returns a downloadable empty array when no records match", async (t) => {
  const { app, headers } = await setup(t);
  const response = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: headers() });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().audit_logs, []);
  assert.ok(response.headers["content-disposition"]);
});

test("audit export accepts timezone timestamps and excludes the exact end instant", async (t) => {
  const { app, headers } = await setup(t, [
    fixture(1, { created_at: new Date("2026-10-12T03:59:59.999Z") }),
    fixture(2, { created_at: new Date("2026-10-12T04:00:00Z") }),
    fixture(3, { created_at: new Date("2026-10-12T04:59:59.999Z") }),
    fixture(4, { created_at: new Date("2026-10-12T05:00:00Z") }),
  ]);
  const response = await app.inject({
    method: "GET", url: endpoint, headers: headers(),
    query: { from: "2026-10-12T09:00:00+05:00", to: "2026-10-12T10:00:00+05:00" },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().audit_logs.map((row: any) => row.id), [3, 2]);
});

test("audit export rejects missing, impossible, reversed or timezone-free boundaries", async (t) => {
  const { app, headers, queries } = await setup(t);
  const invalidQueries = [
    {}, { from: "2026-10-12" }, { to: "2026-10-12" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-02-30T09:00:00Z", to: "2026-03-01T10:00:00Z" },
    { from: "2026-10-13", to: "2026-10-12" },
    { from: "2026-10-12T10:00:00Z", to: "2026-10-12T10:00:00Z" },
    { from: "2026-10-12T09:00:00", to: "2026-10-12T10:00:00Z" },
    { from: "2026-10-12T24:00:00Z", to: "2026-10-13" },
  ];
  for (const query of invalidQueries) {
    const response = await app.inject({ method: "GET", url: endpoint, query, headers: headers() });
    assert.equal(response.statusCode, 400, JSON.stringify(query));
    assert.equal(response.headers["content-disposition"], undefined);
  }
  assert.equal(queries.length, 0);
});

test("audit export enforces authentication and all existing permitted roles", async (t) => {
  const { app, headers, queries } = await setup(t);
  const missing = await app.inject({ method: "GET", url: endpoint, query: dayQuery });
  assert.equal(missing.statusCode, 400); // Required authorization header schema.
  const invalid = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: { authorization: "Bearer invalid" } });
  assert.equal(invalid.statusCode, 401);
  const forbidden = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: headers("cashier") });
  assert.equal(forbidden.statusCode, 403);
  assert.equal(queries.length, 0);

  for (const role of ["superadmin", "owner", "director", "admin", "head_accountant", "head_marketing"]) {
    const response = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: headers(role) });
    assert.equal(response.statusCode, 200, role);
  }
});

test("audit export sends a regular error if the initial database read fails", async (t) => {
  const { app, headers } = await setup(t);
  t.mock.method(AuditLogModel, "findAll", async () => { throw new Error("Database unavailable"); });
  const response = await app.inject({ method: "GET", url: endpoint, query: dayQuery, headers: headers() });
  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["content-disposition"], undefined);
  assert.equal(response.json().statusCode, 500);
});
