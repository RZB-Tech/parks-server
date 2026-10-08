import assert from "node:assert/strict";
import { test } from "node:test";
import { AttractionModel, sequelize } from "../src/plugins/db/postgresql/db";
import { GetAttractionPnlService } from "../src/services/attraction-pnl-services/AttractionPnlServices";

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
        },
        {
          attraction_id: "7",
          month: "2026-10",
          total: "25000",
        },
      ] as any;
    },
  );
  t.mock.method(
    AttractionModel,
    "findAll",
    async () => [{ id: 7, name: "Ferris wheel" }] as any,
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
  assert.equal(result.attractions.length, 1);
  assert.equal(result.attractions[0].total, 40000);
  assert.equal(result.attractions[0].months[0].total, 15000);
  assert.equal(result.attractions[0].months[9].total, 25000);
  assert.equal(result.grand_total, 40000);
});

