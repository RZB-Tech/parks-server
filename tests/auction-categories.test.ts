import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test, TestContext } from "node:test";
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { AuctionCategoryModel, CardModel, EmployeeModel, RoleModel, sequelize } from "../src/plugins/db/postgresql/db";
import AuctionCategoryRouter from "../src/routes/auction-category-routes/AuctionCategoryRoutes";
import ClientAuctionCategoryRouter from "../src/routes/client/auction-category-routes/AuctionCategoryRoutes";

const prefix = "/api/v1/auction-categories";
const routes = [
  { method: "GET", url: prefix },
  { method: "GET", url: `${prefix}/1` },
  { method: "POST", url: prefix, payload: { data: { name: "Premium", price: 300000 } } },
  { method: "PUT", url: `${prefix}/1`, payload: { data: { price: 1000000 } } },
  { method: "DELETE", url: `${prefix}/1` },
  { method: "POST", url: `${prefix}/cards`, payload: { data: { auctionCategoryID: 1, cards: ["000123"] } } },
  { method: "DELETE", url: `${prefix}/cards`, payload: { data: { auctionCategoryID: 1, cards: ["000123"] } } },
  { method: "GET", url: `${prefix}/1/cards` },
] as const;

const setEnv = (t: TestContext, key: string, value: string) => {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
};

const auth = (t: TestContext, role: () => string) => {
  setEnv(t, "JWT_SECRET", "auction-category-test-secret");
  t.mock.method(EmployeeModel, "findOne", async () => ({ id: 1, role: 1 }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ id: 1, name: role() }) as any);
  return { authorization: `Bearer ${jwt.sign({ employee_id: 1 }, process.env.JWT_SECRET!)}` };
};

const makeApp = async (t: TestContext) => {
  const app = Fastify();
  app.register(AuctionCategoryRouter, { prefix: "/api/v1" });
  app.register(ClientAuctionCategoryRouter, { prefix: "/api/v1/client" });
  t.after(() => app.close());
  await app.ready();
  return app;
};

test("all dashboard category routes require authentication and deny other employee roles", async (t) => {
  let role = "admin";
  const headers = auth(t, () => role);
  const app = await makeApp(t);

  for (const route of routes) {
    assert.equal((await app.inject(route)).statusCode, 401, `${route.method} requires authentication`);
    for (const deniedRole of ["admin", "owner", "head_marketing", "head_cashier", "head_accountant", "head_operator", "cashier", "operator", "hr"]) {
      role = deniedRole;
      assert.equal(
        (await app.inject({ ...route, headers })).statusCode,
        403,
        `${deniedRole} cannot ${route.method} categories`,
      );
    }
  }
});

test("superadmin and director can create, list, read, partially update and soft delete categories", async (t) => {
  t.mock.method(CardModel, "findOne", async () => null);
  let role = "superadmin";
  const headers = auth(t, () => role);
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  t.mock.method(sequelize, "transaction", async (callback: any) => callback(transaction));
  let category: AuctionCategoryModel;
  let listOptions: any;

  t.mock.method(AuctionCategoryModel, "create", async (data: any, options: any) => {
    assert.equal(options.transaction, transaction);
    category = AuctionCategoryModel.build({ ...data, id: 1 });
    t.mock.method(category, "update", async (values: any, updateOptions: any) => {
      assert.equal(updateOptions.transaction, transaction);
      category.set(values);
      return category;
    });
    t.mock.method(category, "destroy", async (deleteOptions: any) => {
      assert.equal(deleteOptions.force, undefined);
      assert.equal(deleteOptions.transaction, transaction);
      category.set("deleted_at", new Date());
    });
    return category;
  });
  t.mock.method(AuctionCategoryModel, "findByPk", async (id: number, options: any) => {
    if (options) {
      assert.equal(options.transaction, transaction);
      assert.equal(options.lock, transaction.LOCK.UPDATE);
    }
    return Number(id) === 1 && !category.deleted_at ? category : null;
  });
  t.mock.method(AuctionCategoryModel, "findAndCountAll", async (options: any) => {
    listOptions = options;
    return { rows: [category], count: 1 } as any;
  });
  const app = await makeApp(t);

  for (const allowedRole of ["superadmin", "director"]) {
    role = allowedRole;
    const created = await app.inject({
      method: "POST", url: prefix, headers,
      payload: { data: { name: "  Premium raqamlar  ", price: 300000 } },
    });
    assert.equal(created.statusCode, 200, created.body);
    assert.deepEqual(created.json().data.category, {
      id: 1, name: "Premium raqamlar", price: 300000, is_active: true,
    });

    const updated = await app.inject({
      method: "PUT", url: `${prefix}/1`, headers,
      payload: { data: { price: 1000000, is_active: false } },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.deepEqual(updated.json().data.category, {
      id: 1, name: "Premium raqamlar", price: 1000000, is_active: false,
    });

    const listed = await app.inject({
      method: "GET", url: `${prefix}?search=Premium&is_active=false&page=2&limit=5`, headers,
    });
    assert.equal(listed.statusCode, 200, listed.body);
    assert.deepEqual(listed.json().data.pagination, { total: 1, page: 2, limit: 5, totalPages: 1 });
    assert.equal(listOptions.where.is_active, false);
    assert.equal(listOptions.where.name[Op.iLike], "%Premium%");
    assert.equal(listOptions.offset, 5);
    assert.deepEqual(listOptions.order, [["price", "ASC"], ["id", "ASC"]]);

    const fetched = await app.inject({ method: "GET", url: `${prefix}/1`, headers });
    assert.equal(fetched.statusCode, 200);
    assert.equal(fetched.json().data.category.price, 1000000);

    const deleted = await app.inject({ method: "DELETE", url: `${prefix}/1`, headers });
    assert.equal(deleted.statusCode, 200, deleted.body);
    assert.equal(deleted.json().data.success, true);
    assert.ok(category!.deleted_at instanceof Date);
    assert.equal(AuctionCategoryModel.options.paranoid, true);

    for (const route of [routes[1], routes[3], routes[4]]) {
      assert.equal((await app.inject({ ...route, headers })).statusCode, 404);
    }
  }
});

test("category routes reject invalid names, prices, empty updates, IDs and pagination", async (t) => {
  const headers = auth(t, () => "director");
  const app = await makeApp(t);
  const invalidBodies = [
    {},
    { name: "Premium" },
    { price: 300000 },
    { name: "", price: 300000 },
    { name: " \t\n ", price: 300000 },
    { name: "a".repeat(256), price: 300000 },
    { name: "Premium", price: 0 },
    { name: "Premium", price: -1 },
    { name: "Premium", price: 1.5 },
    { name: "Premium", price: Number.MAX_SAFE_INTEGER + 1 },
    { name: "Premium", price: "invalid" },
  ];
  for (const data of invalidBodies) {
    const response = await app.inject({ method: "POST", url: prefix, headers, payload: { data } });
    assert.equal(response.statusCode, 400, JSON.stringify(data));
  }
  assert.equal((await app.inject({ method: "PUT", url: `${prefix}/1`, headers, payload: { data: {} } })).statusCode, 400);
  for (const id of ["0", "-1", "1.5", "invalid", "9007199254740992"]) {
    assert.equal((await app.inject({ method: "GET", url: `${prefix}/${id}`, headers })).statusCode, 400);
  }
  for (const query of ["page=0", "page=1.5", "limit=0", "limit=101", "is_active=invalid"]) {
    assert.equal((await app.inject({ method: "GET", url: `${prefix}?${query}`, headers })).statusCode, 400);
  }
});

test("client category list authenticates Telegram users and queries only active non-deleted categories", async (t) => {
  setEnv(t, "TELEGRAM_BOT_TOKEN", "auction-test-bot-token");
  let queryCount = 0;
  t.mock.method(AuctionCategoryModel, "findAll", async (options: any) => {
    queryCount += 1;
    assert.deepEqual(options.where, { is_active: true });
    assert.notEqual(options.paranoid, false);
    assert.deepEqual(options.order, [["price", "ASC"], ["id", "ASC"]]);
    return [AuctionCategoryModel.build({ id: 1, name: "Premium", price: "300000" as any, is_active: true })];
  });
  const app = await makeApp(t);
  const url = "/api/v1/client/auction-categories";
  assert.equal((await app.inject({ method: "GET", url })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url, headers: { "x-telegram-init-data": "invalid" } })).statusCode, 401);
  assert.equal(queryCount, 0);

  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: 123, first_name: "Test" }),
  });
  const checkString = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN!).digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  const response = await app.inject({ method: "GET", url, headers: { "x-telegram-init-data": params.toString() } });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json().data.categories, [{ id: 1, name: "Premium", price: 300000, is_active: true }]);
  assert.equal(queryCount, 1);
});
