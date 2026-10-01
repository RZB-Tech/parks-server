import assert from "node:assert/strict";
import { test } from "node:test";
import { EnsureEmployeeNfcSchema } from "../src/plugins/db/postgresql/employeeNfcSchema";

test("employee NFC schema bootstrap adds a unique nullable hash", async () => {
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

  await EnsureEmployeeNfcSchema(sequelize);

  const sql = queries.join("\n");
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "nfc_hash" VARCHAR\(64\)/);
  assert.match(sql, /employees_nfc_hash_unique/);
  assert.match(sql, /WHERE "nfc_hash" IS NOT NULL/);
});
