import { Sequelize } from "sequelize";

/**
 * The project uses sequelize.sync() without an alter/migration runner.
 * Keep this small schema change idempotent so existing production databases
 * receive the new columns before card import or binding routes are used.
 */
export const EnsureCardBindingSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `SELECT pg_advisory_xact_lock(hashtext('cards-bind-schema-v1'))`,
      { transaction },
    );

    await sequelize.query(
      `
        ALTER TABLE "cards"
          ADD COLUMN IF NOT EXISTS "bind_token_hash" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "bound_at" TIMESTAMPTZ
      `,
      { transaction },
    );

    await sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS "cards_bind_token_hash_unique"
          ON "cards" ("bind_token_hash")
          WHERE "bind_token_hash" IS NOT NULL
      `,
      { transaction },
    );
  });
};
