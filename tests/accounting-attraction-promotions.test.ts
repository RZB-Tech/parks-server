import assert from "node:assert/strict";
import { test, TestContext } from "node:test";
import fastify from "fastify";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import {
  AttractionModel, AttractionReportModel, PromotionReportModel, EmployeeModel, RoleModel,
} from "../src/plugins/db/postgresql/db";
import { GetAccountingAttractionReportsService } from "../src/services/attraction-reports-services/AttractionReportsServices";
import AttractionReportsRouter from "../src/routes/attraction-reports-routes/AttractionReportsRoutes";

const range = { start_date: "2026-10-01", end_date: "2026-10-15" };
const counters = (people: number, amount: number) => ({
  total_people: people, total_rounds: 1, rounds_count: 1, refund_count: 1,
  total_online: people, total_offline: 0, total_virtual: 0,
  total_classic: people, total_vip: 0, total_organization: 0,
  original_amount: people * 10_000, discount_amount: people * 10_000 - amount,
  total_amount: amount, paid_amount: amount,
});
const report = (id: number, attraction: number, date: string, people: number, amount: number, status = "confirmed") => ({
  id, attraction, operator: 19, report_type: "zreport", status,
  createdAt: new Date(`${date}T00:30:00+05:00`),
  opened_at: new Date(`${date}T00:30:00+05:00`),
  deletedAt: null, ...counters(people, amount),
});
const promotion = (zreport: number, attraction: number, code: string, people: number, amount: number) => {
  const id = code === "SALE50" ? 50 : code === "SALE20" ? 20 : 10;
  const price = code === "SALE50" ? 5000 : code === "SALE20" ? 8000 : 9000;
  return {
    zreport, attraction, promotion: id, promotion_code: code, promotion_name: code,
    promotion_key: `promotion:${id}:${100 - price / 100}:10000:${price}`,
    promotion_type: "regular", discount_percent: 100 - price / 100,
    original_unit_price: 10000, sale_unit_price: price,
    deletedAt: null, ...counters(people, amount),
  };
};

// Evaluate the query conditions against records rather than returning a canned
// result, so date/status/soft-delete and promotion-scope regressions are visible.
const matches = (row: any, where: any): boolean => Reflect.ownKeys(where).every((key) => {
  const condition = where[key];
  if (key === Op.and) return (Array.isArray(condition) ? condition : [condition]).every((item: any) => matches(row, item));
  if (key === Op.or) return condition.some((item: any) => matches(row, item));
  const value = row[key];
  if (condition === null || typeof condition !== "object") return value === condition;
  return Reflect.ownKeys(condition).every((operator) => {
    const expected = condition[operator];
    if (operator === Op.in) return expected.includes(value);
    if (operator === Op.between) return +value >= +expected[0] && +value <= +expected[1];
    if (operator === Op.gte) return +value >= +expected;
    throw new Error(`Unsupported fixture operator ${String(operator)}`);
  });
});

const setup = (t: TestContext) => {
  const attractions = [
    { id: 7, name: "First attraction", price: 10000, deletedAt: null },
    { id: 8, name: "Second attraction", price: 10000, deletedAt: null },
    { id: 9, name: "Historical attraction", price: 10000, deletedAt: new Date("2026-10-05T00:00:00+05:00") },
    { id: 10, name: "Previously deleted", price: 10000, deletedAt: new Date("2026-09-01T00:00:00+05:00") },
    { id: 11, name: "No reports", price: 10000, deletedAt: null },
  ];
  const reports = [
    report(101, 7, "2026-10-01", 10, 100000),
    report(102, 7, "2026-10-02", 20, 200000),
    report(103, 8, "2026-10-02", 5, 50000),
    report(104, 7, "2026-10-03", 2, 20000),
    report(105, 7, "2026-10-03", 999, 9990000, "closed"),
    report(106, 7, "2026-09-30", 999, 9990000),
    report(107, 9, "2026-10-04", 7, 70000),
    report(108, 9, "2026-10-06", 900, 9000000),
    report(109, 10, "2026-10-02", 900, 9000000),
  ];
  const promotions = [
    promotion(101, 7, "SALE50", 2, 10000),
    promotion(101, 7, "SALE50", 1, 5000), // Another X-report for the same Z-report.
    promotion(102, 7, "SALE50", 4, 20000),
    promotion(102, 7, "SALE20", 3, 24000),
    promotion(103, 8, "SALE50", 1, 5000),
    promotion(107, 9, "HISTORY", 1, 9000),
    promotion(105, 7, "UNCONFIRMED", 999, 9990000),
    promotion(106, 7, "OUTSIDE", 999, 9990000),
    promotion(108, 9, "AFTER_DELETION", 900, 9000000),
    promotion(109, 10, "GONE", 900, 9000000),
  ];
  t.mock.method(AttractionReportModel, "findAll", async (options: any) => reports
    .filter((row) => row.deletedAt === null && matches(row, options.where))
    .map((row) => ({ ...row, get: () => ({ ...row }) })) as any);
  t.mock.method(AttractionModel, "findAll", async (options: any) => attractions
    .filter((row) => matches(row, options.where))
    .map((row) => ({ ...row, get: () => ({ ...row }) })) as any);
  t.mock.method(PromotionReportModel, "findAll", async (options: any) => {
    const grouped = new Map<string, any>();
    for (const row of promotions.filter((row) => matches(row, options.where))) {
      const key = JSON.stringify(options.group.map((field: string) => (row as any)[field]));
      let result = grouped.get(key);
      if (!result) {
        result = Object.fromEntries(options.attributes.map((attribute: any) =>
          typeof attribute === "string" ? [attribute, (row as any)[attribute]] : [attribute[1], "0"]));
        grouped.set(key, result);
      }
      for (const attribute of options.attributes.filter((attribute: any) => Array.isArray(attribute))) {
        const field = attribute[1];
        result[field] = String(Number(result[field]) + Number((row as any)[field]));
      }
    }
    return [...grouped.values()] as any;
  });
  const run = (query: Record<string, unknown> = {}) => GetAccountingAttractionReportsService({ ...range, ...query });
  return { run, reports, promotions };
};

test("accounting includes promotions by default and sums each payment once across days", async (t) => {
  const { run } = setup(t);
  const result = await run();
  const first = result.attractions.find((attraction) => attraction.id === 7)!;
  assert.deepEqual(first.zreports.map((report) => report.id), [101, 102, 104]);
  assert.equal(first.promotion_reports.length, 2, "same promotion across days must stay one period aggregate");
  const sale50 = first.promotion_reports.find((report) => report.promotion_code === "SALE50")!;
  assert.equal(sale50.total_people, 7);
  assert.equal(sale50.paid_amount, 35000);
  assert.equal(sale50.refund_count, 3);
  assert.equal(sale50.original_amount, 70000);
  assert.equal(sale50.discount_amount, 35000);
  assert.equal(first.total_reports.paid_amount, 379000);
  assert.equal(first.total_reports.total_people, 42);
  assert.equal(result.totals.paid_amount, 513000);
  assert.equal(result.totals.total_people, 56);
  assert.equal(result.stats.confirmed, 5);
  assert.equal(result.totals.paid_amount, result.attractions.reduce((sum, attraction) => sum + attraction.total_reports.paid_amount, 0));
  assert.deepEqual(result.promotion_codes, ["basic", "HISTORY", "SALE20", "SALE50"]);
  assert.deepEqual(result.attractions.find((attraction) => attraction.id === 11)!.promotion_reports, []);
  assert.equal(result.attractions.some((attraction) => attraction.id === 10), false);
});

test("accounting promotion filter returns matching reports and excludes base payments from totals", async (t) => {
  const { run } = setup(t);
  const result = await run({ promotion_codes: ["SALE50"] });
  const first = result.attractions.find((attraction) => attraction.id === 7)!;
  assert.deepEqual(first.zreports.map((report) => report.id), [101, 102]);
  assert.deepEqual(first.promotion_reports.map((report) => report.promotion_code), ["SALE50"]);
  assert.equal(first.total_reports.paid_amount, 35000);
  assert.equal(result.totals.paid_amount, 40000);
  assert.equal(result.totals.total_people, 8);
  assert.equal(result.stats.confirmed, 3);
});

test("legacy promotion_code and plural promotion_codes produce the same result", async (t) => {
  const { run } = setup(t);
  assert.deepEqual(await run({ promotion_code: " SALE50 " }), await run({ promotion_codes: ["SALE50"] }).then((result) => ({ ...result, promotion_code: "SALE50" })));
});

test("accounting combines multiple codes and removes duplicate filter values", async (t) => {
  const { run } = setup(t);
  const result = await run({ promotion_codes: [" SALE50, SALE20 ", "SALE50"], promotion_code: "SALE20" });
  assert.equal(result.totals.paid_amount, 64000);
  assert.equal(result.totals.total_people, 11);
  assert.equal(result.attractions.find((attraction) => attraction.id === 7)!.promotion_reports.length, 2);
});

test("basic selects only base totals while basic plus a promotion includes both once", async (t) => {
  const { run } = setup(t);
  const basic = await run({ promotion_codes: [" BASIC "] });
  assert.equal(basic.totals.paid_amount, 440000);
  assert.equal(basic.totals.total_people, 44);
  assert.ok(basic.attractions.every((attraction) => attraction.promotion_reports.length === 0));
  const combined = await run({ promotion_codes: ["basic", "SALE50"] });
  assert.equal(combined.totals.paid_amount, 480000);
  assert.equal(combined.totals.total_people, 52);
  assert.equal(combined.stats.confirmed, 5);
});

test("unknown promotion codes return empty reports and zero totals", async (t) => {
  const { run } = setup(t);
  const result = await run({ promotion_code: "MISSING" });
  assert.equal(result.stats.total, 0);
  assert.equal(result.totals.paid_amount, 0);
  assert.ok(result.attractions.every((attraction) => attraction.zreports.length === 0 && attraction.promotion_reports.length === 0));
});

test("an empty accounting period returns zero totals and no promotion rows", async (t) => {
  const { run } = setup(t);
  const result = await run({ start_date: "2026-11-01", end_date: "2026-11-15" });
  assert.equal(result.stats.total, 0);
  assert.equal(result.totals.paid_amount, 0);
  assert.equal(result.totals.total_people, 0);
  assert.deepEqual(result.promotion_codes, ["basic"]);
  assert.ok(result.attractions.every((attraction) => attraction.zreports.length === 0 && attraction.promotion_reports.length === 0));
});

test("accounting keeps calendar-date and confirmed-report scope and historical visibility", async (t) => {
  const { run } = setup(t);
  const result = await run({ date: "2026-10-01" });
  assert.equal(result.start_date.toISOString(), "2026-09-30T19:00:00.000Z");
  assert.equal(result.end_date.toISOString(), "2026-10-01T18:59:59.999Z");
  assert.equal(result.stats.confirmed, 1);
  assert.equal(result.totals.paid_amount, 115000);
  assert.deepEqual(result.promotion_codes, ["basic", "SALE50"]);
  const historical = await run({ promotion_code: "HISTORY" });
  assert.equal(historical.totals.paid_amount, 9000);
  assert.deepEqual(historical.attractions.find((attraction) => attraction.id === 9)!.zreports.map((report) => report.id), [107]);
  const afterDeletion = await run({ promotion_code: "AFTER_DELETION" });
  assert.equal(afterDeletion.totals.paid_amount, 0);
  assert.equal(afterDeletion.stats.confirmed, 0);
});

test("accounting keeps different historical prices for the same promotion separate", async (t) => {
  const { run, promotions } = setup(t);
  promotions.push({ ...promotion(102, 7, "SALE50", 1, 6000), promotion_key: "promotion:50:50:12000:6000", original_unit_price: 12000, sale_unit_price: 6000 });
  const result = await run({ promotion_code: "SALE50" });
  const first = result.attractions.find((attraction) => attraction.id === 7)!;
  assert.equal(first.promotion_reports.length, 2);
  assert.deepEqual(first.promotion_reports.map((report) => report.sale_unit_price).sort(), [5000, 6000]);
  assert.equal(first.total_reports.paid_amount, 41000);
  assert.equal(result.totals.paid_amount, 46000);
});

test("accounting HTTP response retains its existing shape and serializes promotion totals", async (t) => {
  setup(t);
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "accounting-promotion-test-secret";
  t.mock.method(EmployeeModel, "findOne", async () => ({ id: 19, role: 4 }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ id: 4, name: "head_accountant" }) as any);
  const app = fastify();
  app.register(AttractionReportsRouter, { prefix: "/api/v1" });
  t.after(async () => {
    await app.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  const response = await app.inject({
    url: "/api/v1/attractions/reports/accounting?start_date=2026-10-01&end_date=2026-10-15&promotion_codes=SALE50&promotion_codes=SALE20",
    headers: { authorization: `Bearer ${jwt.sign({ employee_id: 19 }, process.env.JWT_SECRET, { expiresIn: "1h" })}` },
  });
  assert.equal(response.statusCode, 200, response.payload);
  const body = response.json();
  assert.deepEqual(Object.keys(body.data), ["attraction-reports"]);
  const result = body.data["attraction-reports"];
  assert.deepEqual(Object.keys(result).sort(), ["start_date", "end_date", "promotion_codes", "stats", "totals", "attractions"].sort());
  assert.equal(result.totals.paid_amount, 64000);
  const first = result.attractions.find((attraction: any) => attraction.id === 7);
  assert.equal(first.promotion_reports.length, 2);
  assert.equal(first.total_reports.paid_amount, 59000);
  assert.equal("pricing_type" in first, false);
  assert.equal("tariffs" in first, false);
  assert.equal("tariff_reports" in first.total_reports, false);
  assert.ok(first.zreports.every((report: any) => !("promotion_reports" in report)));
});
