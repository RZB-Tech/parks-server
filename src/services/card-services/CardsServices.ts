import { BadRequest, NotFound } from "../../exceptions";
import {
  CardStatusTypes,
  CardType,
} from "../../models/postgresql/cards-model/enums";
import {
  CardBatchModel,
  CardModel,
  CardTransactionModel,
  sequelize,
  UserModel,
} from "../../plugins/db/postgresql/db";
import { ParseCardExcel, ValidateCardExcel } from "../../utils/excelHelpers";
import { CardDTO, UpdateCardDTO } from "../../dtos/card-dtos/CardDto";
import { Op, QueryTypes } from "sequelize";
import { NormalizeUzPhoneNumber } from "../../utils/client/NormilizePhoneNumber";
import { UserStatusTypes } from "../../models/postgresql/client/user-model/enums";
import {
  PrepareOtpService,
  SendPreparedOtpService,
  VerifyOtpService,
} from "../otp-services/OtpServices";
import { SmsTypes } from "../../models/postgresql/client/smslog-model/enums";
import { OtpTypes } from "../../models/postgresql/client/otp-model/enums";
import { CardTransactionStatusTypes } from "../../models/postgresql/card-transactions-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";

export const SendCardRelationOtpService = async (
  body: SendCardRelationOtpData,
): Promise<SendOtpResponseDTO> => {
  const nfc = body.nfc?.trim();

  if (!nfc) {
    throw BadRequest("NFC is required!");
  }

  if (!body.phone_number?.trim()) {
    throw BadRequest("Phone number is required!");
  }

  const phoneNumber = NormalizeUzPhoneNumber(body.phone_number);

  const sequelize = CardModel.sequelize!;

  const prepared = await sequelize.transaction(async (transaction) => {
    const card = await CardModel.findOne({
      where: {
        nfc,
      },

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("Card not found!");
    }

    /*
     * Faqat classic va organization
     * karta ulanadi.
     */
    if (![CardType.CLASSIC, CardType.ORGANIZATION].includes(card.type)) {
      throw BadRequest(
        "Only classic and organization cards can be attached to a user!",
      );
    }

    if (
      [
        CardStatusTypes.BLOCKED,
        CardStatusTypes.LOST,
        CardStatusTypes.FROZEN,
      ].includes(card.status)
    ) {
      throw BadRequest("Card is not available!");
    }

    const user = await UserModel.findOne({
      where: {
        phone_number: phoneNumber,

        status: UserStatusTypes.ACTIVE,
      },

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      throw NotFound("Active user with this phone number not found!");
    }

    if (card.user !== null && Number(card.user) !== Number(user.id)) {
      throw BadRequest("Card is already attached to another user!");
    }

    if (card.user !== null && Number(card.user) === Number(user.id)) {
      throw BadRequest("Card is already attached to this user!");
    }

    return await PrepareOtpService(
      {
        phone_number: phoneNumber,

        purpose: OtpTypes.CARD_RELATION,

        /*
         * OTP aynan shu card bilan
         * bog‘lanadi.
         */
        hash_key: `${phoneNumber}:${card.id}`,

        sms_type: SmsTypes.CARD_RELATION_OTP,

        template: "card_relation_otp",

        masked_message: "Central Park kartani ulash kodi: ******",

        metadata: {
          card_id: Number(card.id),

          card_nfc: card.nfc,

          user_id: Number(user.id),
        },
      },
      transaction,
    );
  });

  if (prepared.blocked) {
    throw BadRequest("OTP_SEND_BLOCKED");
  }

  const smsMessage =
    process.env.ESKIZ_TEST_MODE === "true"
      ? "Это тест от Eskiz"
      : `Central Park kartani ulash kodi: ${prepared.otp_code}`;

  return await SendPreparedOtpService(prepared, smsMessage);
};

export const VerifyCardRelationOtpService = async (
  operatorID: number,
  body: VerifyCardRelationOtpData,
): Promise<CardResponseDTO> => {
  const parsedOperatorID = Number(operatorID);

  if (!Number.isInteger(parsedOperatorID) || parsedOperatorID <= 0) {
    throw BadRequest("Operator is required!");
  }

  const nfc = body.nfc?.trim();

  if (!nfc) {
    throw BadRequest("NFC is required!");
  }

  if (!body.phone_number?.trim()) {
    throw BadRequest("Phone number is required!");
  }

  const phoneNumber = NormalizeUzPhoneNumber(body.phone_number);

  const sequelize = CardModel.sequelize!;

  const result = await sequelize.transaction(async (transaction) => {
    const card = await CardModel.findOne({
      where: {
        nfc,
      },

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("Card not found!");
    }

    if (![CardType.CLASSIC, CardType.ORGANIZATION].includes(card.type)) {
      throw BadRequest(
        "Only classic and organization cards can be attached to a user!",
      );
    }

    if (
      [
        CardStatusTypes.BLOCKED,
        CardStatusTypes.LOST,
        CardStatusTypes.FROZEN,
      ].includes(card.status)
    ) {
      throw BadRequest("Card is not available!");
    }

    const user = await UserModel.findOne({
      where: {
        phone_number: phoneNumber,

        status: UserStatusTypes.ACTIVE,
      },

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      throw NotFound("Active user with this phone number not found!");
    }

    if (card.user !== null && Number(card.user) !== Number(user.id)) {
      throw BadRequest("Card is already attached to another user!");
    }

    if (card.user !== null && Number(card.user) === Number(user.id)) {
      throw BadRequest("Card is already attached to this user!");
    }

    const openXReport = await CashboxReportModel.findOne({
      where: {
        operator: parsedOperatorID,
        report_type: CashboxReportTypes.XREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!openXReport) {
      throw BadRequest("Open cashbox X report required!");
    }

    if (!openXReport.zreport) {
      throw BadRequest("Cashbox Z report is required!");
    }

    const openZReport = await CashboxReportModel.findOne({
      where: {
        id: Number(openXReport.zreport),
        cashbox: Number(openXReport.cashbox),
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!openZReport) {
      throw BadRequest("Open cashbox Z report required!");
    }

    const verifyResult = await VerifyOtpService(
      {
        phone_number: phoneNumber,

        purpose: OtpTypes.CARD_RELATION,

        hash_key: `${phoneNumber}:${card.id}`,

        code: body.code,
      },
      transaction,
    );

    /*
     * Noto‘g‘ri OTP attempt update rollback
     * bo‘lmasligi uchun transaction ichida
     * throw qilinmaydi.
     */
    if (!verifyResult.success) {
      return {
        success: false as const,
        error: verifyResult.error,
      };
    }

    await card.update(
      {
        user: Number(user.id),
      },
      {
        transaction,
      },
    );

    await openXReport.increment(
      {
        relationed_cards_count: 1,
      },
      {
        transaction,
      },
    );

    await openZReport.increment(
      {
        relationed_cards_count: 1,
      },
      {
        transaction,
      },
    );

    const [batch, lastTransaction] = await Promise.all([
      CardBatchModel.findByPk(card.batch, {
        attributes: ["id", "name"],
        transaction,
      }),

      CardTransactionModel.findOne({
        where: {
          card: card.id,
          status: CardTransactionStatusTypes.SUCCESS,
        },

        order: [["id", "DESC"]],

        transaction,
      }),
    ]);

    const cardData = card.get({
      plain: true,
    }) as CardWithTransactionDto;

    const userData = user.get({
      plain: true,
    }) as CardUserDto;

    return {
      success: true as const,
      card: CardDTO({
        ...cardData,
        batches: batch
          ? {
              id: Number(batch.id),

              name: batch.name,
            }
          : null,

        users: userData,

        transaction: lastTransaction
          ? lastTransaction.get({
              plain: true,
            })
          : null,
      }),
    };
  });

  if (!result.success) {
    throw BadRequest(result.error);
  }

  return result.card;
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
    cards: cards.map(CardDTO),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateCardsService = async (
  employeeID: number,
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

  const rows = ParseCardExcel(data.file);

  ValidateCardExcel(rows);

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
          card: row.card_id.trim(),
          nfc: row.nfc_id.trim(),
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
    throw BadRequest("Some cards or NFC IDs already exist.");
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

export const DeleteCardsService = async (body: DeleteCardsData) => {
  const transaction = await sequelize.transaction();

  try {
    const cards = await CardModel.findAll({
      where: {
        id: {
          [Op.in]: body.cardIDs,
        },
      },
      transaction,
    });

    if (!cards.length) return;

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
