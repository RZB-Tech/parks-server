import {
  BadRequest,
  Forbidden,
  InternalServerError,
  NotFound,
} from "../../exceptions";
import {
  CardStatusTypes,
  CardType,
} from "../../models/postgresql/cards-model/enums";
import {
  CardBatchModel,
  CardModel,
  sequelize,
  UserModel,
} from "../../plugins/db/postgresql/db";
import {
  CardImportValidationError,
  NormalizedCardExcelRow,
  ParseCardExcel,
  ValidateCardExcel,
} from "../../utils/excelHelpers";
import { CardDTO, UpdateCardDTO } from "../../dtos/card-dtos/CardDto";
import {
  Op,
  QueryTypes,
  UniqueConstraintError,
  WhereOptions,
} from "sequelize";
import { NormalizeUzPhoneNumber } from "../../utils/client/NormilizePhoneNumber";
import { UserStatusTypes } from "../../models/postgresql/client/user-model/enums";
import {
  EncryptCardBindToken,
  HashCardBindToken,
  IsValidCardBindToken,
} from "../../utils/client/CardBindTokenHelper";

const CARD_MANAGEMENT_ROLES: Record<CardType, readonly string[]> = {
  [CardType.CLASSIC]: ["superadmin", "admin"],
  [CardType.ORGANIZATION]: ["superadmin", "head_accountant"],
  [CardType.VIP]: ["superadmin", "director"],
  [CardType.VIRTUAL]: ["superadmin"],
};

export const AssertCardManagementRole = (
  roleName: string | undefined,
  cardType: CardType,
) => {
  const allowedRoles = CARD_MANAGEMENT_ROLES[cardType] ?? [];

  if (!roleName || !allowedRoles.includes(roleName)) {
    throw Forbidden(
      `You do not have permission to manage ${cardType} cards.`,
    );
  }
};

export const GetCardStatsService = async (query: GetCardsQuery) => {
  const batchWhere: Record<string, unknown> = {};

  if (query.type) {
    batchWhere.type = query.type;
  }

  if (query.batch) {
    batchWhere.id = Number(query.batch);
  }

  const [cardBatches, aggregateRows] = await Promise.all([
    CardBatchModel.findAll({
      where: batchWhere,
      attributes: ["id", "name", "type", "tethered_cards"],
      raw: true,
      order: [["id", "ASC"]],
    }),

    sequelize.query<{
      status: CardStatusTypes | null;
      type: CardType | null;
      batch: string | number | null;
      count: string | number;
      total_balance: string | number;
      status_grouping: string | number;
      type_grouping: string | number;
      batch_grouping: string | number;
    }>(
      `
        SELECT
          "status"::text AS "status",
          "type"::text AS "type",
          "batch",
          COUNT(*) AS "count",
          COALESCE(SUM("balance"), 0) AS "total_balance",
          GROUPING("status") AS "status_grouping",
          GROUPING("type") AS "type_grouping",
          GROUPING("batch") AS "batch_grouping"
        FROM "cards"
        WHERE "deleted_at" IS NULL
          AND (:cardType IS NULL OR "type"::text = :cardType)
          AND (:batchID IS NULL OR "batch" = :batchID)
        GROUP BY GROUPING SETS (
          (),
          ("status"),
          ("type"),
          ("batch")
        )
      `,
      {
        replacements: {
          cardType: query.type ?? null,
          batchID: query.batch ? Number(query.batch) : null,
        },
        type: QueryTypes.SELECT,
      },
    ),
  ]);

  const isGrouping = (
    row: (typeof aggregateRows)[number],
    status: number,
    type: number,
    batch: number,
  ) =>
    Number(row.status_grouping) === status &&
    Number(row.type_grouping) === type &&
    Number(row.batch_grouping) === batch;

  const summaryRow = aggregateRows.find((row) => isGrouping(row, 1, 1, 1));

  const statusCounts = new Map(
    aggregateRows
      .filter(
        (row): row is typeof row & { status: CardStatusTypes } =>
          isGrouping(row, 0, 1, 1) && row.status !== null,
      )
      .map((row) => [row.status, Number(row.count || 0)]),
  );

  const typeCounts = new Map(
    aggregateRows
      .filter(
        (row): row is typeof row & { type: CardType } =>
          isGrouping(row, 1, 0, 1) && row.type !== null,
      )
      .map((row) => [row.type, Number(row.count || 0)]),
  );

  const batchCounts = new Map(
    aggregateRows
      .filter(
        (row): row is typeof row & { batch: string | number } =>
          isGrouping(row, 1, 1, 0) && row.batch !== null,
      )
      .map((row) => [Number(row.batch), Number(row.count || 0)]),
  );

  const stats = {
    total: Number(summaryRow?.count || 0),
    active: statusCounts.get(CardStatusTypes.ACTIVE) ?? 0,
    inactive: statusCounts.get(CardStatusTypes.INACTIVE) ?? 0,
    blocked: statusCounts.get(CardStatusTypes.BLOCKED) ?? 0,
    lost: statusCounts.get(CardStatusTypes.LOST) ?? 0,
    frozen: statusCounts.get(CardStatusTypes.FROZEN) ?? 0,
    tethered: 0,
    returned: statusCounts.get(CardStatusTypes.RETURNED) ?? 0,

    totalBalance: Number(summaryRow?.total_balance || 0),

    types: Object.fromEntries(typeCounts) as Record<string, number>,

    batches: cardBatches.map((batch) => ({
      id: Number(batch.id),
      name: batch.name,
      type: batch.type,
      total: batchCounts.get(Number(batch.id)) ?? 0,
    })),
  };

  for (const batch of cardBatches) {
    stats.tethered += Number(batch.tethered_cards || 0);
  }

  return stats;
};

export const GetCardsService = async (query: GetCardsQuery) => {
  const where: any = {};

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const offset = (page - 1) * limit;

  if (query.batch) {
    where.batch = Number(query.batch);
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();

    where[Op.or] = [
      {
        card: {
          [Op.iLike]: `%${search}%`,
        },
      },
      {
        nfc: {
          [Op.iLike]: `%${search}%`,
        },
      },
    ];
  }

  if (query.statuses) {
    const statuses = Array.isArray(query.statuses)
      ? query.statuses
      : [query.statuses];

    where.status = {
      [Op.in]: statuses,
    };
  }

  const { rows, count } = await CardModel.findAndCountAll({
    where,
    include: [
      {
        model: CardBatchModel,
        as: "batches",
        attributes: ["id", "name", "type"],
      },
      {
        model: UserModel,
        as: "users",
      },
    ],
    limit,
    offset,
    order: [["id", "ASC"]],
  });

  const cards = rows.map((card) =>
    card.get({
      plain: true,
    }),
  );

  return {
    cards: cards.map((card) =>
      CardDTO(card, {
        includeBindToken: true,
      }),
    ),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const GetVipCardUsageService = async (
  params: CardsParams,
): Promise<VipCardUsageResponseDTO> => {
  const cardID = Number(params.cardID);

  if (!Number.isSafeInteger(cardID) || cardID <= 0) {
    throw BadRequest("Card ID is invalid");
  }

  const card = await CardModel.findByPk(cardID, {
    attributes: ["id", "card", "type", "balance"],
  });

  if (!card) {
    throw NotFound("Card not found");
  }

  if (card.type !== CardType.VIP) {
    throw BadRequest("CARD_IS_NOT_VIP");
  }

  const rows = await sequelize.query<VipCardUsageAggregateRow>(
    `
      WITH payment_usage AS (
        SELECT
          payment."id",
          TO_CHAR(
            payment."created_at" AT TIME ZONE 'Asia/Tashkent',
            'YYYY-MM-DD'
          ) AS "date",
          GREATEST(
            COALESCE(payment."original_amount", 0)
              - COALESCE(payment."discount_amount", 0)
              - COALESCE(
                  SUM(
                    CASE
                      WHEN refund_transaction."status"::TEXT = 'success'
                      THEN
                        COALESCE(refund_transaction."original_amount", 0)
                          - COALESCE(
                              refund_transaction."discount_amount",
                              0
                            )
                      ELSE 0
                    END
                  ),
                  0
                ),
            0
          ) AS "spent_amount"
        FROM "card_transactions" AS payment
        LEFT JOIN "attraction_round_refunds" AS refund
          ON refund."original_transaction" = payment."id"
        LEFT JOIN "card_transactions" AS refund_transaction
          ON refund_transaction."id" = refund."refund_transaction"
          AND refund_transaction."deleted_at" IS NULL
        WHERE payment."card" = :cardID
          AND payment."type"::TEXT = 'payment'
          AND payment."status"::TEXT IN ('success', 'cancelled')
          AND payment."deleted_at" IS NULL
        GROUP BY
          payment."id",
          payment."created_at",
          payment."original_amount",
          payment."discount_amount"
      )
      SELECT
        "date",
        SUM("spent_amount") AS "spent_amount"
      FROM payment_usage
      GROUP BY "date"
      ORDER BY "date" DESC
    `,
    {
      replacements: { cardID },
      type: QueryTypes.SELECT,
    },
  );

  const days = rows.map((row) => ({
    date: row.date,
    spent_amount: Number(row.spent_amount),
  }));

  if (
    days.some(
      (day) =>
        !Number.isSafeInteger(day.spent_amount) || day.spent_amount < 0,
    )
  ) {
    throw InternalServerError("VIP_USAGE_AMOUNT_IS_INVALID");
  }

  const totalSpent = days.reduce(
    (total, day) => total + day.spent_amount,
    0,
  );

  if (!Number.isSafeInteger(totalSpent)) {
    throw InternalServerError("VIP_USAGE_TOTAL_IS_INVALID");
  }

  return {
    card: {
      id: Number(card.id),
      card: card.card,
      type: CardType.VIP,
      balance: 0,
    },
    total_spent: totalSpent,
    days,
  };
};

interface PreparedCardExcelRow extends NormalizedCardExcelRow {
  bind_token_hash: string | null;
  legacy_bind_token_hash?: string | null;
}

const AddImportRow = (
  rowsByValue: Map<string, number[]>,
  value: string,
  rowNumber: number,
) => {
  const rowNumbers = rowsByValue.get(value) ?? [];
  rowNumbers.push(rowNumber);
  rowsByValue.set(value, rowNumbers);
};

const SortCardImportErrors = (
  errors: CardImportValidationError[],
): CardImportValidationError[] =>
  errors.sort(
    (first, second) =>
      first.row - second.row || first.code.localeCompare(second.code),
  );

export const FindExistingCardImportErrors = async (
  rows: PreparedCardExcelRow[],
): Promise<CardImportValidationError[]> => {
  const cardIDs = [...new Set(rows.map((row) => row.card_id).filter(Boolean))];
  const nfcIDs = [...new Set(rows.map((row) => row.nfc_id).filter(Boolean))];
  const bindTokenHashes = [
    ...new Set(
      rows
        .flatMap((row) => [
          row.bind_token_hash,
          row.legacy_bind_token_hash ?? null,
        ])
        .filter((hash): hash is string => Boolean(hash)),
    ),
  ];
  const where: WhereOptions<CardsModelI>[] = [];

  if (cardIDs.length) where.push({ card: { [Op.in]: cardIDs } });
  if (nfcIDs.length) where.push({ nfc: { [Op.in]: nfcIDs } });
  if (bindTokenHashes.length) {
    where.push({ bind_token_hash: { [Op.in]: bindTokenHashes } });
  }

  if (!where.length) return [];

  const existingCards = await CardModel.findAll({
    attributes: ["id", "card", "nfc", "bind_token_hash"],
    where: { [Op.or]: where },
    paranoid: false,
  });

  const rowsByCardID = new Map<string, number[]>();
  const rowsByNfcID = new Map<string, number[]>();
  const rowsByBindTokenHash = new Map<string, number[]>();

  for (const row of rows) {
    if (row.card_id) AddImportRow(rowsByCardID, row.card_id, row.row_number);
    if (row.nfc_id) AddImportRow(rowsByNfcID, row.nfc_id, row.row_number);
    if (row.bind_token_hash) {
      AddImportRow(
        rowsByBindTokenHash,
        row.bind_token_hash,
        row.row_number,
      );
    }

    if (row.legacy_bind_token_hash) {
      AddImportRow(
        rowsByBindTokenHash,
        row.legacy_bind_token_hash,
        row.row_number,
      );
    }
  }

  const errors: CardImportValidationError[] = [];

  for (const existingCard of existingCards) {
    const existingRecordID = Number(existingCard.id);

    for (const rowNumber of rowsByCardID.get(existingCard.card) ?? []) {
      errors.push({
        code: "CARD_ID_ALREADY_EXISTS",
        field: "card_id",
        row: rowNumber,
        card_id: existingCard.card,
        existing_record_id: existingRecordID,
      });
    }

    for (const rowNumber of rowsByNfcID.get(existingCard.nfc) ?? []) {
      errors.push({
        code: "NFC_ID_ALREADY_EXISTS",
        field: "nfc_id",
        row: rowNumber,
        nfc_id: existingCard.nfc,
        existing_record_id: existingRecordID,
      });
    }

    if (existingCard.bind_token_hash) {
      for (const rowNumber of
        rowsByBindTokenHash.get(existingCard.bind_token_hash) ?? []) {
        errors.push({
          code: "BIND_TOKEN_ALREADY_EXISTS",
          field: "bind_token",
          row: rowNumber,
          existing_record_id: existingRecordID,
        });
      }
    }
  }

  return SortCardImportErrors(errors);
};

export const CreateCardsService = async (
  employeeID: number,
  roleName: string | undefined,
  data: UploadCardsFromFile,
) => {
  if (!data.file) {
    throw BadRequest("Excel file is required.");
  }

  if (!data.batch_name || !data.batch_name.trim()) {
    throw BadRequest("Batch name is required.");
  }

  if (!data.type) {
    throw BadRequest("Card type is required.");
  }

  const allowedCardTypes = Object.values(CardType);

  if (!allowedCardTypes.includes(data.type)) {
    throw BadRequest("Invalid card type.");
  }

  AssertCardManagementRole(roleName, data.type);

  const isOrganizationCard = data.type === CardType.ORGANIZATION;

  if (
    isOrganizationCard &&
    (data.balance === undefined || data.balance === null)
  ) {
    throw BadRequest("Balance is required for organization cards.");
  }

  if (
    !isOrganizationCard &&
    data.balance !== undefined &&
    data.balance !== null
  ) {
    throw BadRequest("Balance is only allowed for organization cards.");
  }

  let balance = 0;

  if (isOrganizationCard) {
    balance = Number(data.balance);

    if (Number.isNaN(balance)) {
      throw BadRequest("Balance is invalid.");
    }

    if (balance < 0) {
      throw BadRequest("Balance cannot be negative.");
    }

    if (!Number.isInteger(balance)) {
      throw BadRequest("Balance must be an integer.");
    }
  }

  const parsedRows = ParseCardExcel(data.file);
  const validation = ValidateCardExcel(parsedRows);
  const rows: PreparedCardExcelRow[] = validation.rows.map((row) => ({
    ...row,
    bind_token_hash: IsValidCardBindToken(row.bind_token)
      ? EncryptCardBindToken(row.bind_token)
      : null,
    legacy_bind_token_hash: IsValidCardBindToken(row.bind_token)
      ? HashCardBindToken(row.bind_token)
      : null,
  }));
  const existingValueErrors = await FindExistingCardImportErrors(rows);
  const importErrors = SortCardImportErrors([
    ...validation.errors,
    ...existingValueErrors,
  ]);

  if (importErrors.length) {
    throw BadRequest("CARD_IMPORT_VALIDATION_FAILED", importErrors);
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const now = new Date();

      const cardStatus = isOrganizationCard
        ? CardStatusTypes.ACTIVE
        : CardStatusTypes.INACTIVE;

      const batch = await CardBatchModel.create(
        {
          name: data.batch_name.trim(),
          type: data.type,
          total_cards: rows.length,
          active_cards: isOrganizationCard ? rows.length : 0,
          inactive_cards: isOrganizationCard ? 0 : rows.length,
          imported_by: employeeID,
          imported_at: now,
        },
        {
          transaction,
        },
      );

      await CardModel.bulkCreate(
        rows.map((row) => ({
          batch: batch.id,
          card: row.card_id,
          nfc: row.nfc_id,
          bind_token_hash: row.bind_token_hash!,
          type: data.type,
          balance: isOrganizationCard ? balance : 0,
          status: cardStatus,
          imported_at: now,
          activated_at: isOrganizationCard ? now : null,
        })),
        {
          transaction,
        },
      );

      return {
        batch: {
          id: batch.id,
          name: batch.name,
        },
        imported: rows.length,
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const concurrentImportErrors = await FindExistingCardImportErrors(rows);

      throw BadRequest(
        "CARD_IMPORT_VALIDATION_FAILED",
        concurrentImportErrors.length ? concurrentImportErrors : undefined,
      );
    }

    throw error;
  }
};

const CARD_BATCH_COUNTER = {
  [CardStatusTypes.INACTIVE]: "inactive_cards",
  [CardStatusTypes.ACTIVE]: "active_cards",
  [CardStatusTypes.FROZEN]: "frozen_cards",
  [CardStatusTypes.BLOCKED]: "blocked_cards",
  [CardStatusTypes.LOST]: "lost_cards",
  [CardStatusTypes.RETURNED]: "returned_cards",
} as const;

export const UpdateCardsService = async (
  params: CardsParams,
  body: UpdateCardsData,
  roleName: string | undefined,
) => {
  const cardID = Number(params.cardID);

  if (!cardID || Number.isNaN(cardID)) {
    throw BadRequest("Card ID is invalid");
  }

  return await sequelize.transaction(async (transaction) => {
    const card = await CardModel.findByPk(cardID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("Card not found");
    }

    AssertCardManagementRole(roleName, card.type);

    const hasFullname = Boolean(body.fullname?.trim());
    const hasPhoneNumber = Boolean(body.phone_number?.trim());
    const hasUserData = hasFullname || hasPhoneNumber;

    /*
     * fullname yoki phone_number'dan bittasi kelsa,
     * ikkinchisi ham majburiy.
     */
    if (hasUserData && (!hasFullname || !hasPhoneNumber)) {
      throw BadRequest(
        "Fullname and phone number are both required to attach a user",
      );
    }

    /*
     * User faqat VIP kartaga biriktiriladi.
     */
    if (hasUserData && card.type !== CardType.VIP) {
      throw BadRequest("User can only be attached to a VIP card");
    }

    let relatedUser: UserModel | null = null;

    if (hasUserData) {
      const fullname = body.fullname!.trim();
      const phoneNumber = NormalizeUzPhoneNumber(body.phone_number!);

      /*
       * phone_number ustunida UNIQUE constraint bo‘lishi kerak.
       *
       * Bir vaqtda ikkita request kelganda duplicate user
       * yaratilmasligi uchun findOrCreate ishlatilmoqda.
       */
      const [user] = await UserModel.findOrCreate({
        where: {
          phone_number: phoneNumber,
        },
        defaults: {
          fullname,
          phone_number: phoneNumber,
          status: UserStatusTypes.PENDING,
        },
        transaction,
      });

      relatedUser = user;

      /*
       * User oldindan mavjud bo‘lsa, uning fullname'i bo‘sh
       * bo‘lgan holatda kelgan fullname bilan yangilanadi.
       */
      if (!user.fullname?.trim()) {
        await user.update(
          {
            fullname,
          },
          {
            transaction,
          },
        );
      }

      /*
       * VIP kartani user'ga bog‘lash.
       */
      if (Number(card.user) !== Number(user.id)) {
        await card.update(
          {
            user: Number(user.id),
            status: body.status,
            activated_at: new Date(),
          },
          {
            transaction,
          },
        );
      }
    }

    /*
     * Status o‘zgarmagan bo‘lsa counter'larni o‘zgartirmaymiz.
     *
     * Lekin yuqorida user'ni kartaga bog‘lash ishlashi uchun
     * eski early return olib tashlandi.
     */
    if (card.status !== body.status) {
      const batch = await CardBatchModel.findByPk(card.batch, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!batch) {
        throw NotFound("Card batch not found");
      }

      const oldStatus = card.status as CardStatusTypes;
      const newStatus = body.status as CardStatusTypes;

      const oldField = CARD_BATCH_COUNTER[oldStatus];
      const newField = CARD_BATCH_COUNTER[newStatus];

      if (!oldField || !newField) {
        throw BadRequest("Card status counter is not configured");
      }

      await batch.decrement(oldField, {
        by: 1,
        transaction,
      });

      await batch.increment(newField, {
        by: 1,
        transaction,
      });

      await card.update(
        {
          status: newStatus,
          ...(newStatus === CardStatusTypes.ACTIVE
            ? {
                activated_at: new Date(),
                returned_at: null,
                return_description: null,
              }
            : {}),
        },
        {
          transaction,
        },
      );
    }

    await card.reload({
      transaction,
    });

    return {
      ...UpdateCardDTO(card.get({ plain: true })),
      user: relatedUser
        ? {
            id: Number(relatedUser.id),
            fullname: relatedUser.fullname,
            phone_number: relatedUser.phone_number,
            status: relatedUser.status,
          }
        : null,
    };
  });
};

export const DeleteCardsService = async (
  body: DeleteCardsData,
  roleName: string | undefined,
) => {
  const transaction = await sequelize.transaction();

  try {
    const cards = await CardModel.findAll({
      where: {
        id: {
          [Op.in]: body.cardIDs,
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!cards.length) return;

    for (const cardType of new Set(cards.map((card) => card.type))) {
      AssertCardManagementRole(roleName, cardType);
    }

    const batchId = cards[0].batch;
    const statusCountMap: Record<string, number> = {};

    for (const card of cards) {
      const status = card.status;
      statusCountMap[status] = (statusCountMap[status] || 0) + 1;
    }

    await CardModel.destroy({
      where: {
        id: {
          [Op.in]: body.cardIDs,
        },
      },
      force: true,
      transaction,
    });

    await CardBatchModel.decrement("total_cards", {
      by: cards.length,
      where: { id: batchId },
      transaction,
    });

    for (const status in statusCountMap) {
      const field =
        CARD_BATCH_COUNTER[status as keyof typeof CARD_BATCH_COUNTER];

      await CardBatchModel.decrement(field, {
        by: statusCountMap[status],
        where: { id: batchId },
        transaction,
      });
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
