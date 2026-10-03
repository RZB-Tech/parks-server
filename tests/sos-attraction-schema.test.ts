import assert from "node:assert/strict";
import { test } from "node:test";
import { Sequelize } from "sequelize";
import { SosModel } from "../src/models/postgresql/sos-model/SosModel";
import { EnsureSosAttractionSchema } from "../src/plugins/db/postgresql/sosAttractionSchema";

test("SOS sync does not index migration-controlled columns before they exist", () => {
  const sequelize = new Sequelize("postgres://parks:parks@localhost:5432/parks", {
    logging: false,
  });

  SosModel.initialize(sequelize);

  const indexedFields = (SosModel.options.indexes ?? []).flatMap((index) =>
    index.fields.map((field) =>
      typeof field === "string" ? field : field.name,
    ),
  );

  assert.equal(indexedFields.includes("operator"), false);
  assert.equal(indexedFields.includes("attraction"), false);
});

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
