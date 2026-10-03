import { Sequelize } from "sequelize";

const USERS_SCHEMA_LOCK = "parks-server:users-schema-v1";

export const EnsureUsersSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: USERS_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "users"
          ADD COLUMN IF NOT EXISTS "agreement_accepted"
            BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS "language"
            VARCHAR(2) NOT NULL DEFAULT 'uz';

        UPDATE "users"
        SET "agreement_accepted" = FALSE
        WHERE "agreement_accepted" IS NULL;

        UPDATE "users"
        SET "language" = 'uz'
        WHERE "language" IS NULL
           OR "language" NOT IN ('uz', 'ru', 'en');

        ALTER TABLE "users"
          ALTER COLUMN "agreement_accepted" SET DEFAULT FALSE,
          ALTER COLUMN "agreement_accepted" SET NOT NULL,
          ALTER COLUMN "language" SET DEFAULT 'uz',
          ALTER COLUMN "language" SET NOT NULL;
      `,
      { transaction },
    );
  });
};
