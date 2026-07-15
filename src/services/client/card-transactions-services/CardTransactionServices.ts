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

export const ClientAttractionPaymentService = async (
  telegramID: number,
  params: ClientAttractionPaymentParams,
  body: ClientAttractionPaymentData,
): Promise<ClientAttractionPaymentResponseDTO> => {
  const normalizedTelegramID = Number(telegramID);
  const attractionID = Number(params.attractionID);
  const cardID = Number(body.card);
  const membersCount = Number(body.membersCount);
  const clientTotalAmount = Number(body.totalAmount);

  /*
   * VIP uchun totalAmount 0 bo‘lishi mumkin.
   */
  if (!Number.isSafeInteger(clientTotalAmount) || clientTotalAmount < 0) {
    throw BadRequest("INVALID_TOTAL_AMOUNT");
  }

  const sequelize = CardTransactionModel.sequelize!;

  return await sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    },
    async (transaction) => {
      const user = await UserModel.findOne({
        where: { telegram_id: normalizedTelegramID },
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

      /*
       * Attraction tekshiriladi.
       */
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

      const attractionPrice = Number(attraction.price || 0);
      const totalSeats = Number(attraction.seats || 0);

      if (!Number.isSafeInteger(attractionPrice) || attractionPrice < 1) {
        throw BadRequest("INVALID_ATTRACTION_PRICE");
      }

      if (!Number.isInteger(totalSeats) || totalSeats < 1) {
        throw BadRequest("INVALID_ATTRACTION_SEATS");
      }

      /*
       * Attraction'ning ochiq X-reporti olinadi.
       *
       * Report UPDATE lock qilinadi. Shu orqali parallel
       * requestlar ikkita round yaratib yubora olmaydi.
       */
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

      /*
       * Card UPDATE lock qilinadi.
       *
       * Parallel requestlarda bitta card balansidan
       * ikki marta pul yechilmaydi.
       */
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

      /*
       * Card turlari.
       */
      const isClassic = card.type === CardType.CLASSIC;
      const isVirtual = card.type === CardType.VIRTUAL;
      const isVIP = card.type === CardType.VIP;
      const isOrganization = card.type === CardType.ORGANIZATION;

      if (!isClassic && !isVirtual && !isVIP && !isOrganization) {
        throw BadRequest("INVALID_CARD_TYPE");
      }

      /*
       * VIP uchun summa 0.
       *
       * CLASSIC, VIRTUAL va ORGANIZATION uchun:
       * attraction.price * membersCount.
       */
      const calculatedTotalAmount = isVIP ? 0 : attractionPrice * membersCount;

      if (
        !Number.isSafeInteger(calculatedTotalAmount) ||
        calculatedTotalAmount < 0
      ) {
        throw BadRequest("INVALID_CALCULATED_AMOUNT");
      }

      /*
       * VIP uchun frontend yuborgan totalAmount
       * tekshirilmaydi, chunki backend baribir 0 oladi.
       */
      if (!isVIP && clientTotalAmount !== calculatedTotalAmount) {
        throw BadRequest("TOTAL_AMOUNT_MISMATCH");
      }

      const rawBalance = Number(card.balance ?? 0);

      /*
       * VIP karta balance ishlatmaydi.
       *
       * Boshqa kartalar uchun balans valid
       * bo‘lishi kerak.
       */
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

      /*
       * Shu X-reportga tegishli ochiq round olinadi.
       */
      let round = await AttractionRoundModel.findOne({
        where: {
          attraction: attractionID,
          report: Number(report.id),
          status: AttractionRoundStatusTypes.OPEN,
        },
        order: [
          ["round_number", "DESC"],
          ["id", "DESC"],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      let roundCreated = false;

      /*
       * Eski round OPEN holatda qolgan, lekin to‘lib
       * bo‘lgan bo‘lsa, uni yopamiz.
       */
      if (round && Number(round.people_count || 0) >= totalSeats) {
        await round.update(
          {
            status: AttractionRoundStatusTypes.FINISHED,
            finished_at: round.finished_at || new Date(),
          },
          {
            transaction,
          },
        );
        round = null;
      }

      /*
       * Ochiq round bo‘lmasa avtomatik yangi round yaratiladi.
       */
      if (!round) {
        /*
         * Oxirgi round number attraction bo‘yicha olinadi.
         * Shu sabab round_number ketma-ket davom etadi.
         */
        const lastRound = await AttractionRoundModel.findOne({
          where: {
            attraction: attractionID,
          },
          attributes: ["id", "round_number"],
          order: [
            ["round_number", "DESC"],
            ["id", "DESC"],
          ],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const nextRoundNumber = Number(lastRound?.round_number || 0) + 1;

        round = await AttractionRoundModel.create(
          {
            report: Number(report.id),
            attraction: attractionID,
            operator: report.operator,

            round_number: nextRoundNumber,
            status: AttractionRoundStatusTypes.OPEN,

            people_count: 0,

            offline_count: 0,
            online_count: 0,

            classic_count: 0,
            virtual_count: 0,
            vip_count: 0,
            organization_count: 0,

            paid_amount: 0,
            total_amount: 0,

            transactions: [],

            started_at: new Date(),
            finished_at: null,
          },
          {
            transaction,
          },
        );

        roundCreated = true;
      }

      const currentPeopleCount = Number(round.people_count || 0);

      const availableSeats = Math.max(totalSeats - currentPeopleCount, 0);

      /*
       * Bir payment ichidagi odamlarni ikki roundga
       * bo‘lib yubormaymiz.
       */
      if (membersCount > availableSeats) {
        throw BadRequest("NOT_ENOUGH_SEATS");
      }

      /*
       * Transaction yoziladi.
       *
       * VIP uchun:
       * amount = 0
       * balance_before = balance_after
       */
      const cardTransaction = await CardTransactionModel.create(
        {
          card: Number(card.id),

          operator: null,
          cashbox: null,

          attraction: attractionID,

          xreport: Number(report.id),

          type: CardTransactionType.PAYMENT,

          amount: chargedAmount,

          balance_before: balanceBefore,
          balance_after: balanceAfter,

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
       * VIP karta balansiga tegmaymiz.
       *
       * CLASSIC, VIRTUAL va ORGANIZATION
       * kartalaridan pul yechiladi.
       */
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

      const currentTransactions = Array.isArray(round.transactions)
        ? round.transactions.map(Number)
        : [];

      const nextPeopleCount = currentPeopleCount + membersCount;

      const isRoundFull = nextPeopleCount >= totalSeats;

      /*
       * Round yangilanadi.
       *
       * Barcha client payment:
       * online_count += membersCount
       *
       * Bundan tashqari card type counter ham oshadi.
       */
      await round.update(
        {
          people_count: nextPeopleCount,

          online_count: Number(round.online_count || 0) + membersCount,

          classic_count:
            Number(round.classic_count || 0) + (isClassic ? membersCount : 0),

          virtual_count:
            Number(round.virtual_count || 0) + (isVirtual ? membersCount : 0),

          vip_count: Number(round.vip_count || 0) + (isVIP ? membersCount : 0),

          organization_count:
            Number(round.organization_count || 0) +
            (isOrganization ? membersCount : 0),

          /*
           * VIP uchun chargedAmount 0.
           */
          paid_amount: Number(round.paid_amount || 0) + chargedAmount,

          total_amount: Number(round.total_amount || 0) + chargedAmount,

          transactions: [...currentTransactions, Number(cardTransaction.id)],

          /*
           * Round to‘lsa avtomatik yopiladi.
           */
          status: isRoundFull
            ? AttractionRoundStatusTypes.FINISHED
            : AttractionRoundStatusTypes.OPEN,

          finished_at: isRoundFull ? new Date() : null,
        },
        {
          transaction,
        },
      );

      /*
       * Attraction X-report yangilanadi.
       */
      await report.update(
        {
          /*
           * Faqat yangi round yaratilganda +1.
           */
          total_rounds:
            Number(report.total_rounds || 0) + (roundCreated ? 1 : 0),

          total_people: Number(report.total_people || 0) + membersCount,

          /*
           * Barcha client payment online hisoblanadi.
           */
          total_online: Number(report.total_online || 0) + membersCount,

          total_classic:
            Number(report.total_classic || 0) + (isClassic ? membersCount : 0),

          total_virtual:
            Number(report.total_virtual || 0) + (isVirtual ? membersCount : 0),

          total_vip: Number(report.total_vip || 0) + (isVIP ? membersCount : 0),

          total_organization:
            Number(report.total_organization || 0) +
            (isOrganization ? membersCount : 0),

          /*
           * VIP uchun chargedAmount 0.
           */
          paid_amount: Number(report.paid_amount || 0) + chargedAmount,

          total_amount: Number(report.total_amount || 0) + chargedAmount,
        },
        {
          transaction,
        },
      );

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

  const cardMap = new Map(userCards.map((card) => [Number(card.id), card]));

  const attractionMap = new Map(
    attractions.map((attraction) => [Number(attraction.id), attraction]),
  );

  const transactionDTOs = transactions.map((transaction) => {
    const card = cardMap.get(Number(transaction.card));

    if (!card) {
      throw BadRequest("TRANSACTION_CARD_NOT_FOUND");
    }

    const attractionID = Number(transaction.attraction);

    const attraction =
      attractionID > 0 ? (attractionMap.get(attractionID) ?? null) : null;

    return ClientTransactionDTO(transaction, card, attraction);
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
