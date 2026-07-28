import { Op, Transaction } from "sequelize";
import { BadRequest } from "../../../exceptions";
import { CardTransactionModel } from "../../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  AttractionModel,
  AttractionReportModel,
  AttractionRoundModel,
  CardModel,
  UserModel,
} from "../../../plugins/db/postgresql/db";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../../../models/postgresql/attraction-model/enums";
import { AttractionRoundStatusTypes } from "../../../models/postgresql/attraction-round-model/enums";
import { AttractionReportStatusTypes } from "../../../models/postgresql/attraction-report-model/enums";
import {
  CardStatusTypes,
  CardType,
} from "../../../models/postgresql/cards-model/enums";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentType,
} from "../../../models/postgresql/card-transactions-model/enums";
import {
  ClientAttractionPaymentTransactionDTO,
  ClientTransactionDTO,
} from "../../../dtos/client/card-transaction-dtos/CardTransactionDto";
import { getTashkentMonthRangeUTC } from "../../../utils/date";
import { FindBestActivePromotionForAttractionService } from "../../promotion-services/PromotionServices";
import { UpsertPromotionReportService } from "../../promotion-reports-services/PromotionReportsServices";
import { GetOrCreateOpenAttractionRoundService } from "../../attraction-reports-services/AttractionReportsServices";

export const ClientAttractionPaymentService = async (
  telegramID: number,
  params: ClientAttractionPaymentParams,
  body: ClientAttractionPaymentData,
): Promise<ClientAttractionPaymentResponseDTO> => {
  const normalizedTelegramID = Number(telegramID);
  const attractionID = Number(params.attractionID);

  const cardID = Number(body.card);
  const membersCount = Number(body.membersCount);
  const clientAuthorizedAmount = Number(body.totalAmount);

  if (
    !Number.isSafeInteger(normalizedTelegramID) ||
    normalizedTelegramID <= 0
  ) {
    throw BadRequest("INVALID_TELEGRAM_ID");
  }

  if (!Number.isInteger(attractionID) || attractionID <= 0) {
    throw BadRequest("INVALID_ATTRACTION_ID");
  }

  if (!Number.isInteger(cardID) || cardID <= 0) {
    throw BadRequest("INVALID_CARD_ID");
  }

  if (!Number.isInteger(membersCount) || membersCount <= 0) {
    throw BadRequest("INVALID_MEMBERS_COUNT");
  }

  if (
    !Number.isSafeInteger(clientAuthorizedAmount) ||
    clientAuthorizedAmount < 0
  ) {
    throw BadRequest("INVALID_TOTAL_AMOUNT");
  }

  const sequelize = CardTransactionModel.sequelize!;

  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    },
    async (transaction) => {
      const user = await UserModel.findOne({
        where: {
          telegram_id: normalizedTelegramID,
        },
        transaction,
      });

      if (!user) {
        throw BadRequest("USER_NOT_REGISTERED");
      }

      if (
        user.status !== UserStatusTypes.ACTIVE ||
        !user.phone_verified_at ||
        !user.registered_at
      ) {
        throw BadRequest("USER_NOT_VERIFIED");
      }

      const attraction = await AttractionModel.findOne({
        where: {
          id: attractionID,
        },
        transaction,
      });

      if (!attraction) {
        throw BadRequest("ATTRACTION_NOT_FOUND");
      }

      if (attraction.status !== AttractionStatusTypes.ACTIVE) {
        throw BadRequest("ATTRACTION_NOT_AVAILABLE");
      }

      const attractionPrice = Number(attraction.price ?? 0);
      const totalSeats = Number(attraction.seats ?? 0);

      if (!Number.isSafeInteger(attractionPrice) || attractionPrice < 1) {
        throw BadRequest("INVALID_ATTRACTION_PRICE");
      }

      if (!Number.isInteger(totalSeats) || totalSeats < 1) {
        throw BadRequest("INVALID_ATTRACTION_SEATS");
      }

      const report = await AttractionReportModel.findOne({
        where: {
          attraction: attractionID,
          report_type: AttractionReportTypes.XREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        order: [
          ["opened_at", "DESC"],
          ["id", "DESC"],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!report) {
        throw BadRequest("ATTRACTION_REPORT_NOT_OPEN");
      }

      const xreportID = Number(report.id);
      const zreportID = Number(report.zreport);
      const reportOperatorID = Number(report.operator);

      if (!Number.isInteger(zreportID) || zreportID <= 0) {
        throw BadRequest("ATTRACTION_ZREPORT_NOT_FOUND");
      }

      if (!Number.isInteger(reportOperatorID) || reportOperatorID <= 0) {
        throw BadRequest("ATTRACTION_REPORT_OPERATOR_NOT_FOUND");
      }

      const card = await CardModel.findOne({
        where: {
          id: cardID,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!card) {
        throw BadRequest("CARD_NOT_FOUND");
      }

      if (!card.user || Number(card.user) !== Number(user.id)) {
        throw BadRequest("CARD_DOES_NOT_BELONG_TO_USER");
      }

      if (card.status !== CardStatusTypes.ACTIVE) {
        throw BadRequest("CARD_NOT_ACTIVE");
      }

      const isClassic = card.type === CardType.CLASSIC;
      const isVirtual = card.type === CardType.VIRTUAL;
      const isVIP = card.type === CardType.VIP;
      const isOrganization = card.type === CardType.ORGANIZATION;

      if (!isClassic && !isVirtual && !isVIP && !isOrganization) {
        throw BadRequest("INVALID_CARD_TYPE");
      }

      const promotion = await FindBestActivePromotionForAttractionService(
        attractionID,
        transaction,
      );

      const hasPromotion = promotion !== null;

      const originalUnitPrice = promotion
        ? Number(promotion.original_price)
        : attractionPrice;

      const saleUnitPrice = promotion
        ? Number(promotion.discounted_price)
        : attractionPrice;

      const discountPercent = promotion
        ? Number(promotion.discount_percent)
        : 0;

      if (!Number.isSafeInteger(originalUnitPrice) || originalUnitPrice < 0) {
        throw BadRequest("INVALID_ORIGINAL_UNIT_PRICE");
      }

      if (
        !Number.isSafeInteger(saleUnitPrice) ||
        saleUnitPrice < 0 ||
        saleUnitPrice > originalUnitPrice
      ) {
        throw BadRequest("INVALID_SALE_UNIT_PRICE");
      }

      if (
        !Number.isFinite(discountPercent) ||
        discountPercent < 0 ||
        discountPercent > 100
      ) {
        throw BadRequest("INVALID_DISCOUNT_PERCENT");
      }

      const originalAmount = originalUnitPrice * membersCount;
      const saleAmount = saleUnitPrice * membersCount;
      const discountAmount = originalAmount - saleAmount;

      if (
        !Number.isSafeInteger(originalAmount) ||
        !Number.isSafeInteger(saleAmount) ||
        !Number.isSafeInteger(discountAmount)
      ) {
        throw BadRequest("INVALID_CALCULATED_AMOUNT");
      }

      const calculatedTotalAmount = isVIP ? 0 : saleAmount;

      /*
       * Client base narxni tasdiqlaganidan keyin aktiv promotion topilsa,
       * server arzonroq promotion narxini qo‘llaydi.
       *
       * Promotion tugab, joriy narx client tasdiqlagan summadan oshsa,
       * clientni kutilmagan katta yechimdan himoya qilamiz.
       */
      if (calculatedTotalAmount > clientAuthorizedAmount) {
        throw BadRequest("TOTAL_AMOUNT_MISMATCH");
      }

      const rawBalance = Number(card.balance ?? 0);

      if (!isVIP && (!Number.isFinite(rawBalance) || rawBalance < 0)) {
        throw BadRequest("INVALID_CARD_BALANCE");
      }

      const balanceBefore =
        Number.isFinite(rawBalance) && rawBalance >= 0 ? rawBalance : 0;

      const chargedAmount = isVIP ? 0 : calculatedTotalAmount;

      if (!isVIP && balanceBefore < chargedAmount) {
        throw BadRequest("INSUFFICIENT_CARD_BALANCE");
      }

      const balanceAfter = isVIP
        ? balanceBefore
        : balanceBefore - chargedAmount;

      const currentRound = await GetOrCreateOpenAttractionRoundService(
        report,
        attractionID,
        reportOperatorID,
        transaction,
      );

      const round = await AttractionRoundModel.findOne({
        where: {
          id: Number(currentRound.id),
          attraction: attractionID,
          report: xreportID,
          operator: reportOperatorID,
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!round) {
        throw BadRequest("ATTRACTION_ROUND_NOT_FOUND");
      }

      if (round && Number(round.people_count ?? 0) >= totalSeats) {
        throw BadRequest("ROUND_IS_FULL_WAIT_FOR_GO");
      }

      const currentPeopleCount = Number(round.people_count ?? 0);

      const availableSeats = Math.max(totalSeats - currentPeopleCount, 0);

      if (membersCount > availableSeats) {
        throw BadRequest("NOT_ENOUGH_SEATS");
      }

      const currentTransactions = Array.isArray(round.transactions)
        ? round.transactions
            .map(Number)
            .filter(
              (transactionID) =>
                Number.isInteger(transactionID) && transactionID > 0,
            )
        : [];

      const cardTransaction = await CardTransactionModel.create(
        {
          card: Number(card.id),

          operator: null,
          cashbox: null,

          attraction: attractionID,
          xreport: xreportID,

          type: CardTransactionType.PAYMENT,

          amount: chargedAmount,

          balance_before: balanceBefore,
          balance_after: balanceAfter,

          promotion: promotion?.id ?? null,

          promotion_code: promotion?.code ?? null,

          promotion_name: promotion?.name ?? null,

          promotion_type: promotion?.type ?? null,

          promotion_started_at: promotion?.promotion_started_at ?? null,

          promotion_ended_at: promotion?.promotion_ended_at ?? null,

          discount_percent: discountPercent,

          people_count: membersCount,

          original_unit_price: originalUnitPrice,
          sale_unit_price: saleUnitPrice,

          original_amount: originalAmount,
          discount_amount: discountAmount,

          payment_type: PaymentType.ONLINE,

          payment_card_type: null,
          payment_service: null,

          status: CardTransactionStatusTypes.SUCCESS,
        },
        {
          transaction,
        },
      );

      /*
       * Faqat aksiyali payment promotion_reportsga yoziladi.
       */
      if (promotion) {
        await UpsertPromotionReportService(
          {
            attraction: attractionID,

            xreport: xreportID,
            zreport: zreportID,

            promotion: Number(promotion.id),

            promotion_code: promotion.code,
            promotion_name: promotion.name,
            promotion_type: promotion.type,

            promotion_started_at: promotion.promotion_started_at,

            promotion_ended_at: promotion.promotion_ended_at,

            discount_percent: discountPercent,

            original_unit_price: originalUnitPrice,
            sale_unit_price: saleUnitPrice,

            people_count: membersCount,

            total_virtual: isVirtual ? membersCount : 0,

            total_classic: isClassic ? membersCount : 0,

            total_vip: isVIP ? membersCount : 0,

            total_organization: isOrganization ? membersCount : 0,

            total_online: membersCount,
            total_offline: 0,

            original_amount: originalAmount,
            discount_amount: discountAmount,
            paid_amount: chargedAmount,
          },
          transaction,
        );
      }

      if (!isVIP) {
        await card.update(
          {
            balance: balanceAfter,
          },
          {
            transaction,
          },
        );
      }

      const nextPeopleCount = currentPeopleCount + membersCount;

      /*
       * Round barcha paymentlarni hisoblaydi:
       * aksiyali ham, aksiyasiz ham.
       */
      await round.update(
        {
          people_count: nextPeopleCount,

          online_count: Number(round.online_count ?? 0) + membersCount,

          classic_count:
            Number(round.classic_count ?? 0) + (isClassic ? membersCount : 0),

          virtual_count:
            Number(round.virtual_count ?? 0) + (isVirtual ? membersCount : 0),

          vip_count: Number(round.vip_count ?? 0) + (isVIP ? membersCount : 0),

          organization_count:
            Number(round.organization_count ?? 0) +
            (isOrganization ? membersCount : 0),

          paid_amount: Number(round.paid_amount ?? 0) + chargedAmount,

          total_amount: Number(round.total_amount ?? 0) + saleAmount,

          transactions: [...currentTransactions, Number(cardTransaction.id)],

          /*
           * Round to‘lsa ham GO bosilguncha OPEN qoladi.
           * Faqat operator GO endpointi roundni FINISHED qiladi.
           */
          status: AttractionRoundStatusTypes.OPEN,
          finished_at: null,
        },
        {
          transaction,
        },
      );

      /*
       * XReport faqat aksiyasiz paymentlarni hisoblaydi.
       */
      if (!hasPromotion) {
        await report.update(
          {
            total_people: Number(report.total_people ?? 0) + membersCount,

            total_online: Number(report.total_online ?? 0) + membersCount,

            total_classic:
              Number(report.total_classic ?? 0) +
              (isClassic ? membersCount : 0),

            total_virtual:
              Number(report.total_virtual ?? 0) +
              (isVirtual ? membersCount : 0),

            total_vip:
              Number(report.total_vip ?? 0) + (isVIP ? membersCount : 0),

            total_organization:
              Number(report.total_organization ?? 0) +
              (isOrganization ? membersCount : 0),

            paid_amount: Number(report.paid_amount ?? 0) + chargedAmount,

            total_amount: Number(report.total_amount ?? 0) + saleAmount,
          },
          {
            transaction,
          },
        );
      }

      return {
        paid: true,
        message: "PAYMENT_SUCCESS",

        transaction: ClientAttractionPaymentTransactionDTO(cardTransaction),
      };
    },
  );
};

export const GetClientTransactionsService = async (
  telegramID: number,
  query: GetClientTransactionsQuery,
): Promise<ClientTransactionsResponseDTO> => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  const requestedCardID = query.card ? Number(query.card) : null;
  const requestedType = query.type;

  if (
    requestedCardID !== null &&
    (!Number.isInteger(requestedCardID) || requestedCardID < 1)
  ) {
    throw BadRequest("INVALID_CARD_ID");
  }

  const allowedTypes = [CardTransactionType.PAYMENT, CardTransactionType.TOPUP];

  if (requestedType && !allowedTypes.includes(requestedType)) {
    throw BadRequest("INVALID_TRANSACTION_TYPE");
  }

  const { startUTC, endUTC } = getTashkentMonthRangeUTC(query.month);

  const user = await UserModel.findOne({
    where: {
      telegram_id: telegramID,
    },
  });

  if (!user) {
    throw BadRequest("USER_NOT_REGISTERED");
  }

  if (
    user.status !== UserStatusTypes.ACTIVE ||
    !user.phone_verified_at ||
    !user.registered_at
  ) {
    throw BadRequest("USER_NOT_VERIFIED");
  }

  /*
   * Foydalanuvchining barcha kartalari.
   *
   * Bu ro‘yxat frontenddagi "Все карты"
   * filter uchun ham qaytariladi.
   */
  const userCards = await CardModel.findAll({
    where: {
      user: Number(user.id),
    },
    order: [["id", "DESC"]],
  });

  const userCardIDs = userCards.map((card) => Number(card.id));

  if (requestedCardID !== null) {
    const cardBelongsToUser = userCardIDs.includes(requestedCardID);

    if (!cardBelongsToUser) {
      throw BadRequest("CARD_DOES_NOT_BELONG_TO_USER");
    }
  }

  const cardsResponse = userCards.map<ClientTransactionFilterCardDTO>(
    (card) => ({
      id: Number(card.id),
      card: card.card,
      type: card.type,
      status: card.status,
      balance: Number(card.balance || 0),
    }),
  );

  /*
   * Userda umuman karta bo‘lmasa bo‘sh response.
   */
  if (!userCardIDs.length) {
    return {
      cards: [],
      period: {
        month: query.month,
      },
      summary: {
        income: 0,
        expense: 0,
      },
      transactions: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    };
  }

  const selectedCardIDs =
    requestedCardID !== null ? [requestedCardID] : userCardIDs;

  /*
   * createdAt sizning Sequelize attribute nomingiz.
   *
   * Agar CardTransactionModelda attribute created_at
   * deb e’lon qilingan bo‘lsa, createdAt o‘rniga
   * created_at ishlating.
   */
  const baseWhere = {
    card: {
      [Op.in]: selectedCardIDs,
    },

    status: CardTransactionStatusTypes.SUCCESS,

    createdAt: {
      [Op.gte]: startUTC,
      [Op.lt]: endUTC,
    },
  };

  const transactionWhere = requestedType
    ? {
        ...baseWhere,
        type: requestedType,
      }
    : {
        ...baseWhere,
        type: {
          [Op.in]: [CardTransactionType.PAYMENT, CardTransactionType.TOPUP],
        },
      };

  const offset = (page - 1) * limit;

  /*
   * Summary type tabga bog‘liq emas.
   *
   * Masalan payment tab ochiq bo‘lsa ham,
   * shu oy uchun umumiy income va expense qaytadi.
   */
  const [transactionResult, incomeResult, expenseResult] = await Promise.all([
    CardTransactionModel.findAndCountAll({
      where: transactionWhere,
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
    }),

    CardTransactionModel.sum("amount", {
      where: {
        ...baseWhere,
        type: CardTransactionType.TOPUP,
      },
    }),

    CardTransactionModel.sum("amount", {
      where: {
        ...baseWhere,
        type: CardTransactionType.PAYMENT,
      },
    }),
  ]);

  const transactions = transactionResult.rows;

  /*
   * Transactionlar ichidagi attractionlarni bitta
   * query orqali olamiz. N+1 query bo‘lmaydi.
   */
  const attractionIDs = [
    ...new Set(
      transactions
        .map((transaction) => Number(transaction.attraction))
        .filter(
          (attractionID) => Number.isInteger(attractionID) && attractionID > 0,
        ),
    ),
  ];

  const attractions = attractionIDs.length
    ? await AttractionModel.findAll({
        where: {
          id: {
            [Op.in]: attractionIDs,
          },
        },
      })
    : [];

  const transactionIDs = transactions.map((transaction) =>
    Number(transaction.id),
  );

  const rounds = transactionIDs.length
    ? await AttractionRoundModel.findAll({
        where: {
          transactions: {
            [Op.overlap]: transactionIDs,
          },
        },
      })
    : [];

  const cardMap = new Map(userCards.map((card) => [Number(card.id), card]));

  const attractionMap = new Map(
    attractions.map((attraction) => [Number(attraction.id), attraction]),
  );

  const transactionRoundMap = new Map<number, AttractionRoundModel>();

  for (const round of rounds) {
    for (const transactionID of round.transactions ?? []) {
      transactionRoundMap.set(Number(transactionID), round);
    }
  }

  const transactionDTOs = transactions.map((transaction) => {
    const card = cardMap.get(Number(transaction.card));

    if (!card) {
      throw BadRequest("TRANSACTION_CARD_NOT_FOUND");
    }

    const attractionID = Number(transaction.attraction);

    const attraction =
      attractionID > 0 ? (attractionMap.get(attractionID) ?? null) : null;

    const round = transactionRoundMap.get(Number(transaction.id)) ?? null;

    return ClientTransactionDTO(transaction, card, attraction, round);
  });

  const total = Number(transactionResult.count || 0);

  return {
    cards: cardsResponse,
    period: { month: query.month },
    summary: {
      income: Number(incomeResult || 0),
      expense: Number(expenseResult || 0),
    },
    transactions: transactionDTOs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
