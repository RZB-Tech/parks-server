import { Sequelize } from "sequelize";

const ATTRACTIONS_SCHEMA_LOCK = "parks-server:attractions-schema-v1";
const DEFAULT_ATTRACTION_RULES =
  `'${JSON.stringify({
    parent_accompaniment: { uz: "", ru: "", en: "" },
    strict_rules: { uz: "", ru: "", en: "" },
    exceptions: { uz: "", ru: "", en: "" },
  })}'::jsonb`;

/**
 * Existing installations were created with duration as INTEGER. Keep the
 * change explicit because sequelize.sync() does not alter existing columns.
 */
export const EnsureAttractionsSchema = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: ATTRACTIONS_SCHEMA_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        ALTER TABLE "attractions"
          ADD COLUMN IF NOT EXISTS "rules"
            JSONB NOT NULL DEFAULT ${DEFAULT_ATTRACTION_RULES};

        UPDATE "attractions"
        SET "rules" = ${DEFAULT_ATTRACTION_RULES}
        WHERE "rules" IS NULL;

        ALTER TABLE "attractions"
          ALTER COLUMN "rules" SET DEFAULT ${DEFAULT_ATTRACTION_RULES},
          ALTER COLUMN "rules" SET NOT NULL;

        DO $migration$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'attractions'
              AND column_name = 'duration'
              AND (
                data_type <> 'character varying'
                OR character_maximum_length IS DISTINCT FROM 255
              )
          ) THEN
            ALTER TABLE "attractions"
              ALTER COLUMN "duration"
              TYPE VARCHAR(255)
              USING "duration"::TEXT;
          END IF;
        END
        $migration$;
      `,
      { transaction },
    );
  });
};
