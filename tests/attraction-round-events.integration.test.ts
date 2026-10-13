import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Client } from "pg";
import { Sequelize } from "sequelize";
import fastify from "fastify";
import jwt from "jsonwebtoken";
import { EnsureAttractionRoundEventsSchema } from "../src/plugins/db/postgresql/attractionRoundEventsSchema";
import { AttractionRoundEventBroker, AttractionRoundEventListener, AttractionRoundChange }
  from "../src/realtime/attractionRoundEvents";
import AttractionRoundsRouter from "../src/routes/attraction-rounds-routes/AttractionRoundsRoutes";
import { AttractionModel, AttractionReportModel, EmployeeModel, RoleModel }
  from "../src/plugins/db/postgresql/db";

// Explicit opt-in only. Every run uses its own schema and never reads application data.
const connectionString = process.env.ROUND_EVENTS_TEST_DATABASE_URL;
test("PostgreSQL round events reach two backends and a live SSE stream only after commit", {
  skip: !connectionString, timeout: 20_000,
}, async (t) => {
  const schema = `round_sse_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ connectionString });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const config = { connectionString, options: `-c search_path=${schema}` };
  const db = new Sequelize(connectionString!, {
    dialect: "postgres", logging: false,
    dialectOptions: { options: config.options },
  });
  const brokers = [new AttractionRoundEventBroker(), new AttractionRoundEventBroker()];
  const clients: Client[] = [];
  const listeners = brokers.map((broker) => new AttractionRoundEventListener(broker, config,
    { warn() {}, error() {} } as any, (options) => {
      const client = new Client(options);
      clients.push(client);
      return client;
    }));
  const seen: AttractionRoundChange[][] = [[], []];
  let app: ReturnType<typeof fastify> | undefined;
  const abort = new AbortController();
  const oldSecret = process.env.JWT_SECRET;
  t.after(async () => {
    abort.abort();
    await Promise.all(listeners.map((listener) => listener.stop()));
    await app?.close();
    await db.close();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });

  await db.query(`
    CREATE TABLE attraction_rounds (
      id bigint PRIMARY KEY, attraction bigint NOT NULL, operator bigint NOT NULL,
      report bigint, status text DEFAULT 'open', people_count integer DEFAULT 0,
      online_count integer DEFAULT 0, transactions integer[], paid_amount bigint DEFAULT 0,
      updated_at timestamptz DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE attraction_reports (
      id bigint PRIMARY KEY, attraction bigint NOT NULL, operator bigint,
      status text DEFAULT 'open', report_type text DEFAULT 'xreport',
      total_people integer DEFAULT 0, deleted_at timestamptz
    );
  `);
  await EnsureAttractionRoundEventsSchema(db);
  await EnsureAttractionRoundEventsSchema(db); // Idempotent startup installs one trigger per table.
  await Promise.all(listeners.map((listener) => listener.start()));
  assert.ok(brokers.every((broker) => broker.available));
  for (let index = 0; index < brokers.length; index++) {
    brokers[index].subscribe({ attractionID: 7, operatorID: 9,
      onChange: (change) => seen[index].push(change), onUnavailable() {} });
    await clients[index].query("LISTEN round_sse_test_barrier");
  }
  // A barrier is delivered on each dedicated connection after previously committed
  // notifications. This checks absence without timing-based sleeps.
  const barrier = async () => {
    const marker = randomUUID();
    const received = clients.map((client) => new Promise<void>((resolve) => {
      const onNotification = (notification: any) => {
        if (notification.channel === "round_sse_test_barrier" && notification.payload === marker) {
          client.off("notification", onNotification);
          resolve();
        }
      };
      client.on("notification", onNotification);
    }));
    await admin.query("SELECT pg_notify('round_sse_test_barrier', $1)", [marker]);
    await Promise.all(received);
  };
  const assertReason = async (sql: string, reason: string) => {
    const before = seen[0].length;
    await db.query(sql);
    await barrier();
    assert.equal(seen[0].length, before + 1);
    assert.equal(seen[0].at(-1)?.reason, reason);
    assert.deepEqual(seen[1], seen[0]);
  };

  await assertReason("INSERT INTO attraction_reports (id, attraction, operator) VALUES (55,7,9)", "report.changed");
  await assertReason("INSERT INTO attraction_rounds (id, attraction, operator, report) VALUES (70,7,9,55)", "round.opened");

  const beforePayment = seen[0].length;
  const payment = await db.transaction();
  await db.query("UPDATE attraction_rounds SET people_count=2, online_count=2, transactions=ARRAY[100], paid_amount=20000 WHERE id=70", { transaction: payment });
  await barrier();
  assert.equal(seen[0].length, beforePayment, "uncommitted payment must not reach operators");
  await payment.commit();
  await barrier();
  assert.equal(seen[0].at(-1)?.reason, "payment.client");
  assert.deepEqual(seen[1], seen[0]);

  const beforeRollback = seen[0].length;
  const failedPayment = await db.transaction();
  await db.query("UPDATE attraction_rounds SET people_count=3, online_count=3 WHERE id=70", { transaction: failedPayment });
  await failedPayment.rollback();
  await barrier();
  assert.equal(seen[0].length, beforeRollback, "rolled back payments must not produce events");

  await assertReason("UPDATE attraction_rounds SET people_count=3 WHERE id=70", "payment.operator");
  await assertReason("UPDATE attraction_rounds SET status='finished' WHERE id=70", "round.closed");
  await assertReason("UPDATE attraction_rounds SET people_count=1, online_count=1, paid_amount=10000 WHERE id=70", "round.refunded");
  await assertReason("INSERT INTO attraction_rounds (id, attraction, operator, report) VALUES (71,7,9,55)", "round.opened");
  await assertReason("UPDATE attraction_rounds SET status='cancelled' WHERE id=71", "round.cancelled");
  await assertReason("UPDATE attraction_reports SET status='closed' WHERE id=55", "report.changed");

  const beforeNoise = seen[0].length;
  await db.query("UPDATE attraction_rounds SET updated_at=now() WHERE id=70");
  await db.query("UPDATE attraction_reports SET total_people=3 WHERE id=55");
  await db.query("INSERT INTO attraction_rounds (id, attraction, operator) VALUES (80,8,9), (90,7,10)");
  await barrier();
  assert.equal(seen[0].length, beforeNoise);
  assert.deepEqual(seen[1], seen[0]);

  // Verify the actual HTTP transport through the production router with real JWT
  // verification, while substituting employee fixtures for unrelated tables.
  process.env.JWT_SECRET = "round-sse-integration-secret";
  t.mock.method(EmployeeModel, "findOne", async () => ({ id: 9, role: 4 }) as any);
  t.mock.method(RoleModel, "findOne", async () => ({ id: 4, name: "operator" }) as any);
  t.mock.method(AttractionModel, "findByPk", async () => ({ id: 7 }) as any);
  t.mock.method(AttractionReportModel, "findOne", async () => ({ id: 55 }) as any);
  app = fastify();
  app.decorate("attractionRoundEvents", brokers[0]);
  app.register(AttractionRoundsRouter, { prefix: "/api/v1" });
  app.addHook("preClose", async () => brokers[0].disconnect());
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  const response = await fetch(`${address}/api/v1/attractions/7/rounds/events`, {
    headers: { Authorization: `Bearer ${jwt.sign({ employee_id: 9 }, process.env.JWT_SECRET, { expiresIn: "1h" })}` },
    signal: abort.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body!.getReader();
  let frames = "";
  const readUntil = async (needle: string) => {
    while (!frames.includes(needle)) {
      const result = await reader.read();
      assert.equal(result.done, false, "SSE must remain connected until shutdown");
      frames += new TextDecoder().decode(result.value);
    }
  };
  await readUntil("event: ready");
  await db.query("UPDATE attraction_rounds SET people_count=1, online_count=1 WHERE id=71");
  await readUntil('"reason":"payment.client"');
  assert.match(frames, /event: round.changed/);
  assert.match(frames, /"round_id":71/);
  await app.close(); // preClose must finish an active hijacked response without hanging.
  while (!(await reader.read()).done) {}
  assert.equal(brokers[0].available, false);
});
