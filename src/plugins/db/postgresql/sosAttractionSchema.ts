import { Sequelize } from "sequelize";

const SOS_ATTRACTION_SCHEMA_LOCK = "parks-server:sos-attraction-schema-v1";

export const EnsureSosAttractionSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: SOS_ATTRACTION_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "sos"
          ADD COLUMN IF NOT EXISTS "operator" BIGINT,
          ADD COLUMN IF NOT EXISTS "attraction" BIGINT;

        UPDATE "sos" AS s
        SET
          "operator" = ao."operator",
          "attraction" = ao."attraction"
        FROM "attraction_operators" AS ao
        WHERE s."attraction_operator" = ao."id"
          AND (s."operator" IS NULL OR s."attraction" IS NULL);

        CREATE INDEX IF NOT EXISTS "sos_operator_idx"
          ON "sos" ("operator");

        CREATE INDEX IF NOT EXISTS "sos_attraction_idx"
          ON "sos" ("attraction");
      `,
      { transaction },
    );
  });
};
