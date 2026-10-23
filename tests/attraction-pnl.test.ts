import assert from "node:assert/strict";
import { test } from "node:test";
import fastify from "fastify";
import { AttractionModel, sequelize } from "../src/plugins/db/postgresql/db";
import { GetAttractionPnlService } from "../src/services/attraction-pnl-services/AttractionPnlServices";
import { getAttractionPnlSchema } from "../src/routes/attraction-pnl-routes/schema";

const zeroCounts = {
  rounds_count: 0,
  people_count: 0,
  virtual_count: 0,
  classic_count: 0,
  vip_count: 0,
  organization_count: 0,
};

test("attraction P&L qualifies joined report columns and aggregates a month range", async (t) => {
  let sql = "";
  let queryOptions: any;

  t.mock.method(
    sequelize,
    "query",
    async (statement: string, options: any) => {
      sql = statement;
      queryOptions = options;

      return [
        {
          attraction_id: "7",
          month: "2026-01",
          total: "15000",
          rounds_count: "2",
          people_count: "10",
          virtual_count: "3",
          classic_count: "4",
          vip_count: "2",
          organization_count: "1",
        },
        {
          attraction_id: "7",
          month: "2026-10",
          total: "25000",
          rounds_count: "3",
          people_count: "8",
          virtual_count: "2",
          classic_count: "3",
          vip_count: "1",
          organization_count: "2",
        },
        {
          attraction_id: "8",
          month: "2026-10",
          total: "5000",
          rounds_count: "1",
          people_count: "2",
          virtual_count: "1",
          classic_count: "1",
          vip_count: "0",
          organization_count: "0",
        },
      ] as any;
    },
  );
  t.mock.method(
    AttractionModel,
    "findAll",
    async (options: any) => {
      assert.deepEqual(options.attributes, ["id", "name", "price"]);
      return [
        { id: 7, name: "Ferris wheel", price: "20000" },
        { id: 8, name: "Tariff attraction", price: null },
        { id: 9, name: "No activity", price: 0 },
      ] as any;
    },
  );

  const result = await GetAttractionPnlService({
    start_month: "2026-01",
    end_month: "2026-10",
  });

  assert.match(sql, /SELECT\s+ar\.id,\s+ar\.attraction,/);
  assert.match(sql, /FROM attraction_reports AS ar/);
  assert.match(sql, /INNER JOIN attractions AS a/);
  assert.match(sql, /AND ar\.status = :reportStatus/);
  assert.match(sql, /OR ar\.opened_at <= a\.deleted_at/);
  assert.doesNotMatch(sql, /\n\s+id,\s*\n/);
  assert.doesNotMatch(sql, /\n\s+AND status =/);

  assert.equal(
    queryOptions.replacements.startDate.toISOString(),
    "2025-12-31T19:00:00.000Z",
  );
  assert.equal(
    queryOptions.replacements.endDate.toISOString(),
    "2026-10-31T19:00:00.000Z",
  );
  assert.equal(result.months.length, 10);
  assert.equal(result.attractions.length, 3);
  assert.equal(result.attractions[0].price, 20000);
  assert.equal(result.attractions[1].price, null);
  assert.equal(result.attractions[2].price, 0);
  assert.equal(result.attractions[0].total, 40000);
  assert.equal(result.attractions[0].months[0].total, 15000);
  assert.equal(result.attractions[0].months[9].total, 25000);
  assert.deepEqual(result.attractions[0], {
    id: 7, name: "Ferris wheel", price: 20000,
    months: result.attractions[0].months,
    total: 40000, rounds_count: 5, people_count: 18,
    virtual_count: 5, classic_count: 7, vip_count: 3, organization_count: 3,
  });
  assert.deepEqual(result.attractions[0].months[1], {
    month: "2026-02", total: 0, ...zeroCounts,
  });
  assert.deepEqual(result.attractions[2].months[0], {
    month: "2026-01", total: 0, ...zeroCounts,
  });
  assert.deepEqual(result.totals[9], {
    month: "2026-10", total: 30000, rounds_count: 4, people_count: 10,
    virtual_count: 3, classic_count: 4, vip_count: 1, organization_count: 2,
  });
  assert.equal(result.grand_total, 45000);
  assert.equal(result.rounds_count, 6);
  assert.equal(result.people_count, 20);
  assert.equal(result.virtual_count, 6);
  assert.equal(result.classic_count, 8);
  assert.equal(result.vip_count, 3);
  assert.equal(result.organization_count, 3);

  // Exercise the actual response schema: undeclared properties would be stripped.
  const app = fastify();
  t.after(() => app.close());
  app.get("/pnl", { schema: getAttractionPnlSchema }, async () => ({
    statusCode: 200, data: { "attraction-pnl": result },
  }));
  const response = await app.inject({
    url: "/pnl?start_month=2026-01&end_month=2026-10",
    headers: { authorization: "Bearer test" },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().data["attraction-pnl"], result);
});

