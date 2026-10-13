import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, TestContext } from "node:test";
import fastify from "fastify";
import jwt from "jsonwebtoken";
import { Client } from "pg";
import {
  AttractionRoundEventBroker, AttractionRoundEventListener, parseRoundChange, ROUND_EVENTS_CHANNEL,
} from "../src/realtime/attractionRoundEvents";
import AttractionRoundsRouter from "../src/routes/attraction-rounds-routes/AttractionRoundsRoutes";
import { AttractionModel, AttractionReportModel, AttractionOperatorModel, EmployeeModel, RoleModel }
  from "../src/plugins/db/postgresql/db";
import { corsConfigs } from "../src/plugins/cors";

const change = { attraction_id: 7, operator_id: 9, round_id: 70, reason: "payment.client" } as const;
const endpoint = "/api/v1/attractions/7/rounds/events";
const secret = "round-events-test-secret";

const setup = async (t: TestContext) => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.mock.method(EmployeeModel, "findOne", async (options: any) => ({ id: options.where.id, role: "operator" }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ id: 4, name: "operator" }) as any);
  t.mock.method(AttractionModel, "findByPk", async () => ({ id: 7 }) as any);
  t.mock.method(AttractionReportModel, "findOne", async (options: any) =>
    options.where.operator === 9 && options.where.attraction === 7 ? { id: 55 } as any : null);
  t.mock.method(AttractionOperatorModel, "findOne", async () => null);
  const broker = new AttractionRoundEventBroker();
  broker.available = true;
  const app = fastify();
  app.decorate("attractionRoundEvents", broker);
  app.register(require("@fastify/cors"), corsConfigs);
  app.register(AttractionRoundsRouter, { prefix: "/api/v1" });
  app.addHook("preClose", async () => broker.disconnect());
  t.after(async () => {
    broker.disconnect();
    await app.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  const headers = (operatorID = 9, expiresIn = 3600) => ({
    authorization: `Bearer ${jwt.sign({ employee_id: operatorID, token_type: "access" }, secret, { expiresIn })}`,
    origin: "https://operator.example",
  });
  await app.ready();
  return { app, broker, headers };
};

const awaitSubscription = (t: TestContext, broker: AttractionRoundEventBroker) => {
  let resolve!: () => void;
  const ready = new Promise<void>((done) => { resolve = done; });
  const subscribe = broker.subscribe.bind(broker);
  t.mock.method(broker, "subscribe", (subscription: any) => {
    const unsubscribe = subscribe(subscription);
    resolve();
    return unsubscribe;
  });
  return ready;
};

test("round SSE validates auth, role, parameters and operator access before streaming", async (t) => {
  const { app, headers } = await setup(t);
  assert.equal((await app.inject({ url: endpoint })).statusCode, 400);
  assert.equal((await app.inject({ url: endpoint, headers: { authorization: "Bearer invalid" } })).statusCode, 401);
  assert.equal((await app.inject({ url: endpoint, headers: headers(10) })).statusCode, 403);
  for (const attraction of ["0", "-1", "1.5", "wrong", "9007199254740992"]) {
    assert.equal((await app.inject({ url: endpoint.replace("/7/", `/${attraction}/`), headers: headers() })).statusCode, 400);
  }
  t.mock.method(RoleModel, "findOne", async () => ({ name: "cashier" }) as any);
  assert.equal((await app.inject({ url: endpoint, headers: headers() })).statusCode, 403);
});

test("round SSE returns a retryable error while its database listener is unavailable", async (t) => {
  const { app, broker, headers } = await setup(t);
  broker.available = false;
  const response = await app.inject({ url: endpoint, headers: headers() });
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers["retry-after"], "3");
  assert.equal(response.json().message, "ATTRACTION_ROUND_EVENTS_UNAVAILABLE");
});

test("round SSE reports missing attractions", async (t) => {
  const { app, headers } = await setup(t);
  t.mock.method(AttractionModel, "findByPk", async () => null);
  assert.equal((await app.inject({ url: endpoint, headers: headers() })).statusCode, 404);
});

test("round SSE preserves CORS, sends ready and isolates attraction/operator changes", async (t) => {
  const { app, broker, headers } = await setup(t);
  const ready = awaitSubscription(t, broker);
  const pending = app.inject({ url: endpoint, headers: headers() });
  await ready;
  broker.publish({ ...change, attraction_id: 8 });
  broker.publish({ ...change, operator_id: 10 });
  broker.publish(change);
  broker.publish({ ...change, reason: "round.closed" });
  broker.publish({ ...change, round_id: null, reason: "report.changed" });
  broker.disconnect();
  const response = await pending;
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "text/event-stream; charset=utf-8");
  assert.equal(response.headers["access-control-allow-origin"], "https://operator.example");
  assert.equal(response.headers["access-control-allow-credentials"], "true");
  assert.equal(response.headers["x-accel-buffering"], "no");
  assert.match(response.payload, /event: ready\ndata: .*"resync":true/);
  assert.equal((response.payload.match(/event: round.changed/g) ?? []).length, 3);
  assert.match(response.payload, /"reason":"payment.client"/);
  assert.match(response.payload, /"reason":"round.closed"/);
  assert.match(response.payload, /"round_id":null,"reason":"report.changed"/);
  assert.doesNotMatch(response.payload, /"operator_id":10|"attraction_id":8/);
  // Publishing after cleanup must not write to an ended response.
  broker.publish(change);
});

test("active assignment permits subscribing before the first report opens", async (t) => {
  const { app, broker, headers } = await setup(t);
  t.mock.method(AttractionReportModel, "findOne", async () => null);
  t.mock.method(AttractionOperatorModel, "findOne", async () => ({ id: 1 }) as any);
  const ready = awaitSubscription(t, broker);
  const pending = app.inject({ url: endpoint, headers: headers() });
  await ready;
  broker.disconnect();
  assert.equal((await pending).statusCode, 200);
});

test("stream sends heartbeat and closes when the verified access token expires", async (t) => {
  const { app, broker, headers } = await setup(t);
  t.mock.timers.enable({ apis: ["Date", "setInterval", "setTimeout"], now: Date.now() });
  const ready = awaitSubscription(t, broker);
  const pending = app.inject({ url: endpoint, headers: headers(9, 20) });
  await ready;
  t.mock.timers.tick(15_000);
  t.mock.timers.tick(5000);
  const response = await pending;
  assert.match(response.payload, /: heartbeat/);
  assert.match(response.payload, /event: auth.expired/);
});

test("an open stream closes when employee access is revoked", async (t) => {
  const { app, broker, headers } = await setup(t);
  t.mock.timers.enable({ apis: ["Date", "setInterval", "setTimeout"], now: Date.now() });
  const ready = awaitSubscription(t, broker);
  const pending = app.inject({ url: endpoint, headers: headers() });
  await ready;
  t.mock.method(EmployeeModel, "findOne", async () => null);
  t.mock.timers.tick(60_000);
  const response = await pending;
  assert.match(response.payload, /event: access.revoked/);
});

test("database notification parser rejects malformed IDs, reasons and arbitrary fields", () => {
  assert.deepEqual(parseRoundChange(JSON.stringify({ ...change, card_balance: 123 })), change);
  for (const value of [null, [], "invalid", { ...change, operator_id: null },
    { ...change, attraction_id: -1 }, { ...change, round_id: 1.5 },
    { ...change, round_id: null }, { ...change, reason: "report.changed" },
    { ...change, reason: "unexpected" }]) {
    assert.equal(parseRoundChange(JSON.stringify(value)), null);
  }
  assert.equal(parseRoundChange("{bad JSON"), null);
});

class FakeClient extends EventEmitter {
  statements: string[] = [];
  failConnect = false;
  async connect() { if (this.failConnect) throw new Error("unavailable"); }
  async query(sql: string) { this.statements.push(sql); }
  async end() { this.emit("end"); }
}

test("listener resumes LISTEN after connection loss and closes existing streams for resync", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const broker = new AttractionRoundEventBroker();
  const clients: FakeClient[] = [];
  const listener = new AttractionRoundEventListener(broker, {}, { warn() {}, error() {} } as any, () => {
    const client = new FakeClient();
    clients.push(client);
    return client as unknown as Client;
  });
  t.after(() => listener.stop());
  await listener.start();
  assert.equal(broker.available, true);
  assert.deepEqual(clients[0].statements, [`LISTEN ${ROUND_EVENTS_CHANNEL}`]);
  const received: unknown[] = [];
  let disconnected = 0;
  broker.subscribe({ attractionID: 7, operatorID: 9, onChange: (event) => received.push(event), onUnavailable: () => { disconnected++; } });
  clients[0].emit("notification", { channel: "other", payload: JSON.stringify(change) });
  clients[0].emit("notification", { channel: ROUND_EVENTS_CHANNEL, payload: "bad JSON" });
  clients[0].emit("notification", { channel: ROUND_EVENTS_CHANNEL, payload: JSON.stringify(change) });
  assert.deepEqual(received, [change]);
  clients[0].emit("error", new Error("lost"));
  clients[0].emit("end");
  assert.equal(disconnected, 1);
  assert.equal(broker.available, false);
  t.mock.timers.tick(1000);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(clients.length, 2);
  assert.equal(broker.available, true);
  assert.deepEqual(clients[1].statements, [`LISTEN ${ROUND_EVENTS_CHANNEL}`]);
  clients[0].emit("notification", { channel: ROUND_EVENTS_CHANNEL, payload: JSON.stringify(change) });
  clients[1].emit("notification", { channel: ROUND_EVENTS_CHANNEL, payload: JSON.stringify(change) });
  assert.deepEqual(received, [change]); // Old subscribers must reconnect, then fetch a snapshot.
  await listener.stop();
  t.mock.timers.tick(30_000);
  assert.equal(clients.length, 2);
  assert.equal(broker.available, false);
});

test("initial listener failures remain unavailable until the retry succeeds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const broker = new AttractionRoundEventBroker();
  let attempts = 0;
  const listener = new AttractionRoundEventListener(broker, {}, { warn() {}, error() {} } as any, () => {
    const client = new FakeClient();
    client.failConnect = attempts++ === 0;
    return client as unknown as Client;
  });
  t.after(() => listener.stop());
  await listener.start();
  assert.equal(broker.available, false);
  t.mock.timers.tick(1000);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(broker.available, true);
  assert.equal(attempts, 2);
});
