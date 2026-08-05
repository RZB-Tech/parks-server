import { Sequelize } from "sequelize";

/** Allows one payment transaction to have multiple partial refund rows. */
export const ApplyAttractionRoundRefundSchemaMigration = async (
  sequelize: Sequelize,
) => {
  await sequelize.query(`
    DO $$
    DECLARE
      unique_constraint RECORD;
    BEGIN
      FOR unique_constraint IN
        SELECT constraint_data.conname
        FROM (
          SELECT
            constraint_row.conname,
            ARRAY_AGG(attribute_row.attname::TEXT ORDER BY attribute_row.attname) AS columns
          FROM pg_constraint AS constraint_row
          JOIN LATERAL UNNEST(constraint_row.conkey) AS key_column(attnum)
            ON TRUE
          JOIN pg_attribute AS attribute_row
            ON attribute_row.attrelid = constraint_row.conrelid
           AND attribute_row.attnum = key_column.attnum
          WHERE constraint_row.conrelid =
            'public.attraction_round_refunds'::REGCLASS
            AND constraint_row.contype = 'u'
          GROUP BY constraint_row.conname
        ) AS constraint_data
        WHERE constraint_data.columns = ARRAY['original_transaction']::TEXT[]
      LOOP
        EXECUTE FORMAT(
          'ALTER TABLE public.attraction_round_refunds DROP CONSTRAINT %I',
          unique_constraint.conname
        );
      END LOOP;
    END
    $$
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS
      "attraction_round_refunds_original_transaction"
    ON "attraction_round_refunds" ("original_transaction")
  `);
};
