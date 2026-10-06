import { Sequelize } from "sequelize";

const UZUM_MERCHANT_SCHEMA_LOCK = "parks-server:uzum-merchant-schema-v1";

/**
 * The old Uzum Checkout integration required a per-transaction redirect URL.
 * Merchant API sends transactions to our webhooks instead, so the redirect URL
 * is optional and the protocol-specific request data is stored separately.
 */
export const EnsureUzumMerchantSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: UZUM_MERCHANT_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "uzum_transactions"
          ALTER COLUMN "redirect_url" DROP NOT NULL,
          ADD COLUMN IF NOT EXISTS "service_id" BIGINT,
          ADD COLUMN IF NOT EXISTS "payment_source" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "tariff" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "processing_reference_number" VARCHAR(128),
          ADD COLUMN IF NOT EXISTS "phone" VARCHAR(32),
          ADD COLUMN IF NOT EXISTS "raw_create" JSONB,
          ADD COLUMN IF NOT EXISTS "raw_confirm" JSONB,
          ADD COLUMN IF NOT EXISTS "raw_reverse" JSONB
      `,
      { transaction },
    );
  });
};
