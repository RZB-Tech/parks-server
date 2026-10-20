import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "pg";
import { Sequelize } from "sequelize";
import { AttractionModel, sequelize } from "../src/plugins/db/postgresql/db";
import { GetAttractionPnlService } from "../src/services/attraction-pnl-services/AttractionPnlServices";

// Explicit opt-in. Fixtures live in an isolated schema, never application tables.
const connectionString = process.env.PNL_TEST_DATABASE_URL;

test("PostgreSQL P&L excludes VIP usage while retaining other card revenue", {
  skip: !connectionString,
  timeout: 20_000,
}, async (t) => {
  const schema = `pnl_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ connectionString });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db = new Sequelize(connectionString!, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { connectionString, options: `-c search_path=${schema}` },
  });
  t.after(async () => {
    await db.close();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });

  await db.query(`
    CREATE TABLE attractions (id bigint PRIMARY KEY, deleted_at timestamptz);
    CREATE TABLE attraction_reports (
      id bigint PRIMARY KEY, attraction bigint, zreport bigint,
      report_type text, status text, opened_at timestamptz,
      deleted_at timestamptz, total_amount bigint DEFAULT 0,
      total_people integer DEFAULT 0, total_virtual integer DEFAULT 0,
      total_classic integer DEFAULT 0, total_vip integer DEFAULT 0,
      total_organization integer DEFAULT 0, total_rounds integer DEFAULT 0
    );
    CREATE TABLE attraction_rounds (
      id bigint PRIMARY KEY, attraction bigint DEFAULT 7, report bigint DEFAULT 11,
      status text DEFAULT 'finished', deleted_at timestamptz
    );
    CREATE TABLE cards (id bigint PRIMARY KEY, type text, deleted_at timestamptz);
    CREATE TABLE card_transactions (
      id bigint PRIMARY KEY, card bigint, attraction bigint DEFAULT 7,
      xreport bigint DEFAULT 11, type text DEFAULT 'payment',
      status text DEFAULT 'success', deleted_at timestamptz,
      promotion bigint, people_count integer DEFAULT 1,
      sale_unit_price bigint DEFAULT 20000
    );
    CREATE TABLE attraction_round_refunds (
      original_transaction bigint, refund_transaction bigint, people_count integer
    );
    CREATE TABLE promotion_reports (
      zreport bigint, total_amount bigint, total_vip integer, sale_unit_price bigint,
      total_people integer DEFAULT 0, total_virtual integer DEFAULT 0,
      total_classic integer DEFAULT 0, total_organization integer DEFAULT 0,
      rounds_count integer DEFAULT 0
    );
    INSERT INTO attractions VALUES (7, NULL);
    INSERT INTO cards VALUES
      (1, 'vip', NULL), (2, 'classic', NULL),
      (3, 'organization', NULL), (4, 'virtual', NULL);
  `);
  t.mock.method(sequelize, "query", (sql: string, options: any) =>
    db.query(sql, options) as any,
  );
  t.mock.method(AttractionModel, "findAll", async () =>
    [{ id: 7, name: "Historical attraction", price: 99000 }] as any,
  );

  const reset = async (total: number) => {
    await db.query(`
      TRUNCATE attraction_reports, attraction_rounds, card_transactions,
        attraction_round_refunds, promotion_reports;
      INSERT INTO attraction_reports
        (id, attraction, zreport, report_type, status, opened_at, total_amount)
      VALUES
        (1, 7, NULL, 'zreport', 'confirmed', '2026-09-30T20:00:00Z', :total),
        (11, 7, 1, 'xreport', 'closed', '2026-09-30T20:00:00Z', :total);
    `, { replacements: { total } });
  };
  const check = async (expected: number) => {
    const result = await GetAttractionPnlService({
      start_month: "2026-09", end_month: "2026-11",
    });
    assert.deepEqual(result.attractions[0].months.map(({ month, total }) => ({ month, total })), [
      { month: "2026-09", total: 0 },
      { month: "2026-10", total: expected },
      { month: "2026-11", total: 0 },
    ]);
    assert.equal(result.attractions[0].total, expected);
    assert.deepEqual(result.totals, result.attractions[0].months);
    assert.equal(result.grand_total, expected);
  };

  await t.test("VIP-only historical confirmed reports return zero", async () => {
    await reset(20000);
    await db.query("INSERT INTO card_transactions (id, card) VALUES (1, 1)");
    await check(0);
  });

  await t.test("Classic, Organization and Virtual amounts remain in every total", async () => {
    await reset(72000);
    await db.query(`
      INSERT INTO card_transactions (id, card, sale_unit_price) VALUES
        (1, 1, 20000), (2, 2, 30000), (3, 3, 15000), (4, 4, 7000);
    `);
    await check(52000);
  });

  await t.test("multiple tariffs and X-reports use payment price snapshots", async () => {
    await reset(60000);
    await db.query(`
      INSERT INTO attraction_reports (id, attraction, zreport, report_type)
        VALUES (12, 7, 1, 'xreport');
      INSERT INTO card_transactions (id, card, people_count, sale_unit_price, xreport)
        VALUES (1, 1, 2, 5000, 11), (2, 1, 1, 20000, 12), (3, 2, 1, 30000, 11);
    `);
    await check(30000);
  });

  await t.test("promotion VIP uses net counts and discounted historical prices", async () => {
    await reset(0);
    await db.query(`
      INSERT INTO promotion_reports (zreport, total_amount, total_vip, sale_unit_price) VALUES
        (1, 35000, 2, 10000), (1, 12000, 1, 6000), (1, 0, 1, 0);
      INSERT INTO card_transactions (id, card, promotion, sale_unit_price)
        VALUES (1, 1, 50, 10000), (2, 1, 20, 6000);
    `);
    await check(21000);
  });

  await t.test("repeated partial VIP refunds subtract only remaining usage", async () => {
    // 3 VIP entries at 10000, with 2 refunded, plus Classic 30000.
    await reset(40000);
    await db.query(`
      INSERT INTO card_transactions (id, card, people_count, sale_unit_price)
        VALUES (1, 1, 3, 10000), (2, 2, 1, 30000);
      INSERT INTO card_transactions (id, card, type, sale_unit_price)
        VALUES (3, 1, 'refund', 10000), (4, 1, 'refund', 10000);
      INSERT INTO attraction_round_refunds VALUES (1, 3, 1), (1, 4, 1);
    `);
    await check(30000);
  });

  await t.test("fully refunded VIP does not reduce other revenue again", async () => {
    await reset(30000);
    await db.query(`
      INSERT INTO card_transactions (id, card, status, sale_unit_price)
        VALUES (1, 1, 'cancelled', 20000), (2, 2, 'success', 30000);
      INSERT INTO card_transactions (id, card, type) VALUES (3, 1, 'refund');
      INSERT INTO attraction_round_refunds VALUES (1, 3, 1);
    `);
    await check(30000);
  });

  await t.test("failed/deleted payments and invalid refunds do not affect VIP exclusion", async () => {
    await reset(50000);
    await db.query(`
      INSERT INTO card_transactions (id, card, status, deleted_at)
        VALUES (1, 1, 'success', NULL), (2, 1, 'failed', NULL),
          (3, 1, 'success', now());
      INSERT INTO card_transactions (id, card, type, status, deleted_at)
        VALUES (4, 1, 'refund', 'failed', NULL),
          (5, 1, 'refund', 'success', now());
      INSERT INTO attraction_round_refunds VALUES (1, 4, 1), (1, 5, 1);
    `);
    await check(30000);
  });

  await t.test("unconfirmed, deleted and out-of-range Z-reports stay excluded", async () => {
    await reset(50000);
    await db.query(`
      INSERT INTO card_transactions (id, card) VALUES (1, 1);
      INSERT INTO attraction_reports
        (id, attraction, report_type, status, opened_at, deleted_at, total_amount)
      VALUES
        (2, 7, 'zreport', 'open', '2026-10-01T00:00:00Z', NULL, 90000),
        (3, 7, 'zreport', 'confirmed', '2026-10-01T00:00:00Z', now(), 90000),
        (4, 7, 'zreport', 'confirmed', '2026-08-01T00:00:00Z', NULL, 90000);
      INSERT INTO promotion_reports (zreport, total_amount, total_vip, sale_unit_price)
        VALUES (2, 90000, 0, 10000), (3, 90000, 0, 10000);
    `);
    await check(30000);
  });

  await t.test("net card counts include promotions and VIP while physical rounds count once", async () => {
    await reset(100000);
    await db.query(`
      -- Net base counters after two VIP admissions were refunded.
      UPDATE attraction_reports SET
        total_people = 6, total_virtual = 2, total_classic = 2,
        total_vip = 1, total_organization = 1, total_rounds = 3
      WHERE id = 1;
      INSERT INTO card_transactions (id, card, people_count, sale_unit_price)
        VALUES (1, 1, 3, 10000);
      INSERT INTO card_transactions (id, card, type, sale_unit_price)
        VALUES (2, 1, 'refund', 10000), (3, 1, 'refund', 10000);
      INSERT INTO attraction_round_refunds VALUES (1, 2, 1), (1, 3, 1);

      -- Different promotion snapshots can share the same physical round.
      INSERT INTO promotion_reports
        (zreport, total_amount, total_vip, sale_unit_price, total_people,
         total_virtual, total_classic, total_organization, rounds_count)
      VALUES
        (1, 30000, 1, 5000, 3, 1, 1, 0, 2),
        (1, 12000, 0, 6000, 2, 0, 0, 2, 1);
      INSERT INTO attraction_reports (id, attraction, zreport, report_type)
        VALUES (12, 7, 1, 'xreport');
      INSERT INTO attraction_rounds (id, report) VALUES
        (1, 11), (2, 11), (3, 12), (4, 12);
      -- Finished round 4 remains counted even if all its people were refunded.
      INSERT INTO attraction_rounds (id, status, deleted_at) VALUES
        (5, 'open', NULL), (6, 'cancelled', NULL), (7, 'finished', now());
      INSERT INTO attraction_rounds (id, attraction) VALUES (8, 999);

      INSERT INTO attraction_reports
        (id, attraction, report_type, status, opened_at, total_amount,
         total_people, total_virtual, total_classic)
      VALUES
        (5, 7, 'zreport', 'confirmed', '2026-11-01T00:00:00Z', 15000, 2, 1, 1),
        (6, 7, 'zreport', 'open', '2026-10-01T00:00:00Z', 90000, 9, 9, 0),
        (7, 7, 'zreport', 'confirmed', '2026-08-01T00:00:00Z', 90000, 9, 9, 0),
        (8, 7, 'zreport', 'confirmed', '2026-10-01T00:00:00Z', 90000, 9, 9, 0);
      UPDATE attraction_reports SET deleted_at = now() WHERE id = 8;
      INSERT INTO attraction_reports (id, attraction, zreport, report_type) VALUES
        (51, 7, 5, 'xreport'), (61, 7, 6, 'xreport'),
        (71, 7, 7, 'xreport'), (81, 7, 8, 'xreport');
      INSERT INTO attraction_rounds (id, report) VALUES
        (9, 51), (10, 61), (11, 71), (12, 81);
    `);

    const result = await GetAttractionPnlService({
      start_month: "2026-09", end_month: "2026-11",
    });
    assert.equal(result.attractions[0].price, 99000);
    assert.deepEqual(result.attractions[0].months, [
      {
        month: "2026-09", total: 0, rounds_count: 0, people_count: 0,
        virtual_count: 0, classic_count: 0, vip_count: 0, organization_count: 0,
      },
      {
        month: "2026-10", total: 127000, rounds_count: 4, people_count: 11,
        virtual_count: 3, classic_count: 3, vip_count: 2, organization_count: 3,
      },
      {
        month: "2026-11", total: 15000, rounds_count: 1, people_count: 2,
        virtual_count: 1, classic_count: 1, vip_count: 0, organization_count: 0,
      },
    ]);
    assert.deepEqual(result.totals, result.attractions[0].months);
    assert.equal(result.grand_total, 142000);
    assert.equal(result.attractions[0].total, result.grand_total);
    for (const [field, expected] of Object.entries({
      rounds_count: 5, people_count: 13, virtual_count: 4,
      classic_count: 4, vip_count: 2, organization_count: 3,
    })) {
      assert.equal((result as any)[field], expected, field);
      assert.equal((result.attractions[0] as any)[field], expected, field);
    }
  });
});
