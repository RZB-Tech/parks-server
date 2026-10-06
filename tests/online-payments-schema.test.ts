import assert from "node:assert/strict";
import { test } from "node:test";
import { EnsureOnlinePaymentsSchema } from "../src/plugins/db/postgresql/onlinePaymentsSchema";
import { EnsureUzumMerchantSchema } from "../src/plugins/db/postgresql/uzumMerchantSchema";

test("online payments schema bootstrap adds every required legacy column", async () => {
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

  await EnsureOnlinePaymentsSchema(sequelize);

  const sql = queries.join("\n");

  assert.match(sql, /CREATE TYPE "enum_cashboxes_type"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "type"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "system_key"/);
  assert.match(sql, /cashboxes_system_key_unique/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "oneqr_amount"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "activated_cards_amount"/);
  assert.match(sql, /pg_advisory_xact_lock/);
});

test("Uzum Merchant schema bootstrap makes checkout fields compatible", async () => {
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

  await EnsureUzumMerchantSchema(sequelize);

  const sql = queries.join("\n");
  assert.match(sql, /ALTER COLUMN "redirect_url" DROP NOT NULL/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "service_id"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "payment_source"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "raw_create"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "raw_confirm"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "raw_reverse"/);
  assert.match(sql, /pg_advisory_xact_lock/);
});
