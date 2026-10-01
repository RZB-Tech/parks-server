import assert from "node:assert/strict";
import { test } from "node:test";
import { EnsureSosAttractionSchema } from "../src/plugins/db/postgresql/sosAttractionSchema";

test("SOS schema stores attraction sessions without assignment rows", async () => {
  const sql: string[] = [];
  const sequelize = {
    transaction: async (callback: any) => callback({ id: "transaction" }),
    query: async (query: string) => {
      sql.push(query);
      return [];
    },
  } as any;

  await EnsureSosAttractionSchema(sequelize);

  const statements = sql.join("\n");
  assert.match(statements, /ADD COLUMN IF NOT EXISTS "operator" BIGINT/);
  assert.match(statements, /ADD COLUMN IF NOT EXISTS "attraction" BIGINT/);
  assert.match(statements, /FROM "attraction_operators" AS ao/);
  assert.match(statements, /CREATE INDEX IF NOT EXISTS "sos_operator_idx"/);
  assert.match(statements, /CREATE INDEX IF NOT EXISTS "sos_attraction_idx"/);
});
