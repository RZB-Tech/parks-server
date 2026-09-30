import assert from "node:assert/strict";
import { test } from "node:test";
import { EnsureVirtualCardSequences } from "../src/plugins/db/postgresql/virtualCardSequences";

test("virtual card sequence bootstrap creates and repairs both sequences", async () => {
  const queries: string[] = [];
  const fakeTransaction = {};
  const sequelize = {
    query: async (sql: string) => {
      queries.push(sql);
      return [];
    },
    transaction: async (callback: (transaction: object) => Promise<void>) =>
      callback(fakeTransaction),
  } as any;

  await EnsureVirtualCardSequences(sequelize);

  const sql = queries.join("\n");

  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(
    sql,
    /CREATE SEQUENCE IF NOT EXISTS public\."virtual_card_number_seq"/,
  );
  assert.match(
    sql,
    /CREATE SEQUENCE IF NOT EXISTS public\."virtual_card_nfc_seq"/,
  );
  assert.match(sql, /START WITH 300000000/);
  assert.match(sql, /START WITH 300100000000/);
  assert.match(sql, /ALTER SEQUENCE[\s\S]+OWNED BY NONE/);
  assert.match(sql, /MAX\("card"::BIGINT\) \+ 1/);
  assert.match(sql, /MAX\("nfc"::BIGINT\) \+ 1/);
  assert.match(sql, /setval\([\s\S]+virtual_card_number_seq/);
  assert.match(sql, /setval\([\s\S]+virtual_card_nfc_seq/);
});
