import { Sequelize } from "sequelize";

const EMPLOYEE_NFC_SCHEMA_LOCK = "parks-server:employee-nfc-schema-v1";

export const EnsureEmployeeNfcSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: EMPLOYEE_NFC_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "employees"
          ADD COLUMN IF NOT EXISTS "nfc_hash" VARCHAR(64);

        CREATE UNIQUE INDEX IF NOT EXISTS "employees_nfc_hash_unique"
          ON "employees" ("nfc_hash")
          WHERE "nfc_hash" IS NOT NULL;
      `,
      { transaction },
    );
  });
};
