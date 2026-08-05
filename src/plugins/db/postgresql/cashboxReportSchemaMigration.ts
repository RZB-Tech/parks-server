import { Sequelize } from "sequelize";

/** Keeps existing databases aligned with the cashbox report model. */
export const ApplyCashboxReportSchemaMigration = async (
  sequelize: Sequelize,
) => {
  await sequelize.query(`
    ALTER TYPE "enum_card_transactions_payment_service"
    ADD VALUE IF NOT EXISTS 'oneqr'
  `);

  await sequelize.query(`
    ALTER TABLE "cashbox_reports"
      ADD COLUMN IF NOT EXISTS "oneqr_amount" BIGINT NOT NULL DEFAULT 0,
      DROP COLUMN IF EXISTS "refunded_amount",
      DROP COLUMN IF EXISTS "refund_transactions_count",
      DROP COLUMN IF EXISTS "payme_refunded_amount",
      DROP COLUMN IF EXISTS "uzum_refunded_amount",
      DROP COLUMN IF EXISTS "click_refunded_amount",
      DROP COLUMN IF EXISTS "returned_cards_amount",
      DROP COLUMN IF EXISTS "transactions_count"
  `);
};
