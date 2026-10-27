import { Sequelize } from "sequelize";

// sync() does not alter existing tables. Keep new-column indexes here so sync
// cannot try to create them before an existing cards table has the columns.
export const EnsureCardAuctionSchema = async (sequelize: Sequelize): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext('parks-server:card-auction-schema-v1'))",
      { transaction },
    );
    await sequelize.query(
      `
        ALTER TABLE "cards"
          ADD COLUMN IF NOT EXISTS "auction_category_id" BIGINT
            REFERENCES "auction_categories" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
          ADD COLUMN IF NOT EXISTS "auction_status" VARCHAR(16);

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'cards'::regclass
              AND conname = 'cards_auction_state_check'
          ) THEN
            ALTER TABLE "cards" ADD CONSTRAINT "cards_auction_state_check" CHECK (
              ("auction_category_id" IS NULL AND "auction_status" IS NULL)
              OR (
                "auction_category_id" IS NOT NULL AND "auction_status" IS NOT NULL
                AND "auction_status" IN ('listed', 'reserved', 'sold')
                AND (
                  "auction_status" = 'sold'
                  OR ("status"::text = 'inactive' AND "user" IS NULL)
                )
              )
            );
          END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS "cards_auction_category_status_idx"
          ON "cards" ("auction_category_id", "auction_status", "id")
          WHERE "deleted_at" IS NULL;
      `,
      { transaction },
    );
  });
};
