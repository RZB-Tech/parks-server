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

/**
 * Adds persisted attraction refund counters without recalculating them on
 * every report request. Existing refunds are backfilled only when the columns
 * are introduced; later refunds update the counters in the refund transaction.
 */
export const ApplyAttractionReportSchemaMigrations = async (
  sequelize: Sequelize,
) => {
  await sequelize.query(`
    DO $migration$
    DECLARE
      attraction_reports_column_added BOOLEAN := FALSE;
      promotion_reports_column_added BOOLEAN := FALSE;
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'attraction_reports'
          AND column_name = 'refund_count'
      ) THEN
        ALTER TABLE "attraction_reports"
          ADD COLUMN "refund_count" BIGINT NOT NULL DEFAULT 0;

        attraction_reports_column_added := TRUE;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'promotion_reports'
          AND column_name = 'refund_count'
      ) THEN
        ALTER TABLE "promotion_reports"
          ADD COLUMN "refund_count" BIGINT NOT NULL DEFAULT 0;

        promotion_reports_column_added := TRUE;
      END IF;

      IF attraction_reports_column_added THEN
        WITH xreport_refunds AS (
          SELECT
            report."id" AS "report_id",
            COUNT(refund."id") FILTER (
              WHERE original_transaction."promotion" IS NULL
            )::BIGINT AS "refund_count"
          FROM "attraction_reports" AS report
          LEFT JOIN "card_transactions" AS original_transaction
            ON original_transaction."xreport" = report."id"
          LEFT JOIN "attraction_round_refunds" AS refund
            ON refund."original_transaction" = original_transaction."id"
          WHERE report."report_type"::TEXT = 'xreport'
          GROUP BY report."id"
        )
        UPDATE "attraction_reports" AS report
        SET "refund_count" = counts."refund_count"
        FROM xreport_refunds AS counts
        WHERE report."id" = counts."report_id";

        WITH zreport_refunds AS (
          SELECT
            zreport."id" AS "report_id",
            COUNT(refund."id") FILTER (
              WHERE original_transaction."promotion" IS NULL
            )::BIGINT AS "refund_count"
          FROM "attraction_reports" AS zreport
          LEFT JOIN "attraction_reports" AS xreport
            ON xreport."zreport" = zreport."id"
            AND xreport."report_type"::TEXT = 'xreport'
          LEFT JOIN "card_transactions" AS original_transaction
            ON original_transaction."xreport" = xreport."id"
          LEFT JOIN "attraction_round_refunds" AS refund
            ON refund."original_transaction" = original_transaction."id"
          WHERE zreport."report_type"::TEXT = 'zreport'
          GROUP BY zreport."id"
        )
        UPDATE "attraction_reports" AS report
        SET "refund_count" = counts."refund_count"
        FROM zreport_refunds AS counts
        WHERE report."id" = counts."report_id";
      END IF;

      IF promotion_reports_column_added THEN
        WITH promotion_refunds AS (
          SELECT
            report."id" AS "report_id",
            COUNT(refund."id")::BIGINT AS "refund_count"
          FROM "promotion_reports" AS report
          LEFT JOIN "card_transactions" AS original_transaction
            ON original_transaction."xreport" = report."xreport"
            AND original_transaction."promotion" = report."promotion"
            AND original_transaction."discount_percent" =
              report."discount_percent"
            AND original_transaction."original_unit_price" =
              report."original_unit_price"
            AND original_transaction."sale_unit_price" =
              report."sale_unit_price"
          LEFT JOIN "attraction_round_refunds" AS refund
            ON refund."original_transaction" = original_transaction."id"
          GROUP BY report."id"
        )
        UPDATE "promotion_reports" AS report
        SET "refund_count" = counts."refund_count"
        FROM promotion_refunds AS counts
        WHERE report."id" = counts."report_id";
      END IF;
    END;
    $migration$;
  `);
};
