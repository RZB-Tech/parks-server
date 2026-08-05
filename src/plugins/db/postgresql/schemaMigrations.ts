import { Sequelize } from "sequelize";

/**
 * Keeps existing installations compatible with the returned-card model.
 * Every statement is idempotent, so it is safe to run on each application
 * startup and on databases where part or all of the schema already exists.
 */
export const ApplyCardsSchemaMigrations = async (sequelize: Sequelize) => {
  await sequelize.query(`
    ALTER TYPE "enum_cards_status"
    ADD VALUE IF NOT EXISTS 'returned'
  `);

  await sequelize.query(`
    ALTER TABLE "cards"
      ADD COLUMN IF NOT EXISTS "returned_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "return_description" TEXT NULL
  `);

  await sequelize.query(`
    ALTER TABLE "card_batches"
      ADD COLUMN IF NOT EXISTS "returned_cards" INTEGER NOT NULL DEFAULT 0
  `);

  await sequelize.query(`
    ALTER TABLE "cashbox_reports"
      ADD COLUMN IF NOT EXISTS "returned_cards_count" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "returned_cards_amount" BIGINT NOT NULL DEFAULT 0
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "cards_status_id_not_deleted_idx"
      ON "cards" ("status", "id")
      WHERE "deleted_at" IS NULL;

    CREATE INDEX IF NOT EXISTS "cards_batch_status_id_not_deleted_idx"
      ON "cards" ("batch", "status", "id")
      WHERE "deleted_at" IS NULL;

    CREATE INDEX IF NOT EXISTS "cards_type_status_id_not_deleted_idx"
      ON "cards" ("type", "status", "id")
      WHERE "deleted_at" IS NULL
  `);

  await sequelize.query(`
    UPDATE "card_batches" AS batch
    SET "returned_cards" = counts."returned_cards"
    FROM (
      SELECT
        existing_batch."id",
        COUNT(card."id") FILTER (
          WHERE card."status"::text = 'returned'
        )::INTEGER AS "returned_cards"
      FROM "card_batches" AS existing_batch
      LEFT JOIN "cards" AS card
        ON card."batch" = existing_batch."id"
        AND card."deleted_at" IS NULL
      WHERE existing_batch."deleted_at" IS NULL
      GROUP BY existing_batch."id"
    ) AS counts
    WHERE batch."id" = counts."id"
      AND batch."returned_cards" IS DISTINCT FROM counts."returned_cards"
  `);
};
