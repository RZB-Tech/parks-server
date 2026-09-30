import { Sequelize } from "sequelize";

const VIRTUAL_CARD_SEQUENCES_LOCK =
  "parks-server:virtual-card-sequences-v1";

/**
 * Virtual card identifiers use dedicated sequences instead of the cards table
 * identity. Keep them bootstrapped here so fresh databases and databases that
 * were truncated with RESTART IDENTITY both recover automatically.
 */
export const EnsureVirtualCardSequences = async (
  sequelize: Sequelize,
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
      {
        replacements: { lockName: VIRTUAL_CARD_SEQUENCES_LOCK },
        transaction,
      },
    );

    await sequelize.query(
      `
        CREATE SEQUENCE IF NOT EXISTS public."virtual_card_number_seq"
          AS BIGINT
          INCREMENT BY 1
          MINVALUE 300000000
          MAXVALUE 399999999
          START WITH 300000000
          NO CYCLE;

        CREATE SEQUENCE IF NOT EXISTS public."virtual_card_nfc_seq"
          AS BIGINT
          INCREMENT BY 1
          MINVALUE 300100000000
          MAXVALUE 300199999999
          START WITH 300100000000
          NO CYCLE;

        ALTER SEQUENCE public."virtual_card_number_seq" OWNED BY NONE;
        ALTER SEQUENCE public."virtual_card_nfc_seq" OWNED BY NONE;
      `,
      { transaction },
    );

    await sequelize.query(
      `
        DO $migration$
        DECLARE
          card_last_value BIGINT;
          card_is_called BOOLEAN;
          card_current_next BIGINT;
          card_required_next BIGINT;
          nfc_last_value BIGINT;
          nfc_is_called BOOLEAN;
          nfc_current_next BIGINT;
          nfc_required_next BIGINT;
        BEGIN
          SELECT "last_value", "is_called"
            INTO card_last_value, card_is_called
          FROM public."virtual_card_number_seq";

          SELECT GREATEST(
            300000000,
            COALESCE(MAX("card"::BIGINT) + 1, 300000000)
          )
            INTO card_required_next
          FROM public."cards"
          WHERE "type"::TEXT = 'virtual'
            AND "card" ~ '^3[0-9]{8}$';

          card_current_next := CASE
            WHEN card_is_called THEN card_last_value + 1
            ELSE card_last_value
          END;

          IF card_current_next < card_required_next THEN
            PERFORM setval(
              'public.virtual_card_number_seq'::regclass,
              card_required_next,
              FALSE
            );
          END IF;

          SELECT "last_value", "is_called"
            INTO nfc_last_value, nfc_is_called
          FROM public."virtual_card_nfc_seq";

          SELECT GREATEST(
            300100000000,
            COALESCE(MAX("nfc"::BIGINT) + 1, 300100000000)
          )
            INTO nfc_required_next
          FROM public."cards"
          WHERE "type"::TEXT = 'virtual'
            AND "nfc" ~ '^3001[0-9]{8}$';

          nfc_current_next := CASE
            WHEN nfc_is_called THEN nfc_last_value + 1
            ELSE nfc_last_value
          END;

          IF nfc_current_next < nfc_required_next THEN
            PERFORM setval(
              'public.virtual_card_nfc_seq'::regclass,
              nfc_required_next,
              FALSE
            );
          END IF;
        END;
        $migration$;
      `,
      { transaction },
    );
  });
};
