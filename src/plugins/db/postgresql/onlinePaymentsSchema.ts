import { Sequelize } from "sequelize";

const ONLINE_PAYMENTS_SCHEMA_LOCK =
  "parks-server:online-payments-schema-v1";

/**
 * sequelize.sync() does not add columns to existing tables unless alter mode is
 * enabled. Keep the online-payments schema bootstrap explicit and idempotent so
 * both existing and fresh installations match the current Sequelize models.
 */
export const EnsureOnlinePaymentsSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.query(`
    DO $migration$
    BEGIN
      CREATE TYPE "enum_cashboxes_type" AS ENUM ('physical', 'virtual');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    $migration$;
  `);

  // Run enum additions outside the table-migration transaction so new values
  // are committed before application queries can use them.
  await sequelize.query(`
    ALTER TYPE "enum_cashboxes_type"
      ADD VALUE IF NOT EXISTS 'physical'
  `);
  await sequelize.query(`
    ALTER TYPE "enum_cashboxes_type"
      ADD VALUE IF NOT EXISTS 'virtual'
  `);

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: ONLINE_PAYMENTS_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "cashboxes"
          ADD COLUMN IF NOT EXISTS "type"
            "enum_cashboxes_type" NOT NULL DEFAULT 'physical',
          ADD COLUMN IF NOT EXISTS "system_key" VARCHAR(100)
      `,
      { transaction },
    );

    await sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS "cashboxes_system_key_unique"
          ON "cashboxes" ("system_key")
      `,
      { transaction },
    );

    await sequelize.query(
      `
        ALTER TABLE "cashbox_reports"
          ADD COLUMN IF NOT EXISTS "oneqr_amount"
            BIGINT NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "activated_cards_amount"
            BIGINT NOT NULL DEFAULT 0
      `,
      { transaction },
    );
  });
};
