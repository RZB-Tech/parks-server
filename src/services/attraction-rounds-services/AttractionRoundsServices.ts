import { col, fn, Op } from "sequelize";
import {
  AttractionRoundDTO,
  AttractionRoundTransactionDTO,
} from "../../dtos/attraction-rounds-dtos/AttractionRoundDto";
import { BadRequest, InternalServerError, NotFound } from "../../exceptions";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { AttractionOperatorModel } from "../../models/postgresql/attraction-operator-model/AttractionOperatorModel";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../../models/postgresql/attraction-model/enums";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { getTashkentDayRangeUTC } from "../../utils/date";
import { CardTransactionModel } from "../../models/postgresql/card-transactions-model/CardTransactionModel";
import { CardModel } from "../../models/postgresql/cards-model/CardModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";
import { PromotionReportModel } from "../../models/postgresql/promotion-reports-model/PromotionReportsModel";
import { CardType } from "../../models/postgresql/cards-model/enums";
import { AttractionRoundRefundModel } from "../../models/postgresql/attraction-round-refund-model/AttractionRoundRefundModel";

type AttractionRoundRefundAggregate = {
  original_transaction: number | string;
  refunded_people_count: number | string;
};

const LoadAttractionRoundTransactions = async (
  transactionIDs: number[],
  cardNumber?: string,
): Promise<Map<number, AttractionRoundTransactionPlain>> => {
  const transactionMap = new Map<number, AttractionRoundTransactionPlain>();

  if (transactionIDs.length === 0) {
    return transactionMap;
  }

  const transactions = await CardTransactionModel.findAll({
    where: {
      id: {
        [Op.in]: transactionIDs,
      },
      type: CardTransactionType.PAYMENT,
      status: {
        [Op.in]: [
          CardTransactionStatusTypes.SUCCESS,
          CardTransactionStatusTypes.CANCELLED,
        ],
      },
    },
    include: [
      {
        model: CardModel,
        as: "cards",
        required: cardNumber !== undefined,
        ...(cardNumber !== undefined ? { where: { card: cardNumber } } : {}),
      },
    ],
  });

  const paymentIDs = transactions.map((transaction) => Number(transaction.id));
  const refundAggregates = paymentIDs.length
    ? ((await AttractionRoundRefundModel.findAll({
        attributes: [
          "original_transaction",
          [fn("SUM", col("people_count")), "refunded_people_count"],
        ],
        where: {
          original_transaction: {
            [Op.in]: paymentIDs,
          },
        },
        group: ["original_transaction"],
        raw: true,
      })) as unknown as AttractionRoundRefundAggregate[])
    : [];

  const refundedPeopleMap = new Map(
    refundAggregates.map((refund) => [
      Number(refund.original_transaction),
      Number(refund.refunded_people_count || 0),
    ]),
  );

  for (const transaction of transactions) {
    const plain = transaction.get({
      plain: true,
    }) as AttractionRoundTransactionPlain;
    const transactionID = Number(plain.id);
    const originalPeopleCount = Number(plain.people_count || 0);
    const refundedPeopleCount = refundedPeopleMap.get(transactionID) ?? 0;
    const remainingPeopleCount = originalPeopleCount - refundedPeopleCount;

    if (
      !Number.isSafeInteger(originalPeopleCount) ||
      originalPeopleCount <= 0 ||
      !Number.isSafeInteger(refundedPeopleCount) ||
      refundedPeopleCount < 0 ||
      !Number.isSafeInteger(remainingPeopleCount) ||
      remainingPeopleCount < 0
    ) {
      throw InternalServerError("ROUND_TRANSACTION_REFUND_TOTALS_ARE_INVALID");
    }

    transactionMap.set(transactionID, {
      ...plain,
      people_count: remainingPeopleCount,
      original_people_count: originalPeopleCount,
      refunded_people_count: refundedPeopleCount,
      refund_status:
        refundedPeopleCount === 0
          ? "none"
          : remainingPeopleCount === 0
            ? "full"
            : "partial",
    });
  }

  return transactionMap;
};

export const GetCurrentAttractionRoundService = async (
  operatorID: number,
  params: AttractionRoundParams,
): Promise<AttractionRoundResponseDTO | null> => {
  const parsedOperatorID = Number(operatorID);

  if (!Number.isInteger(parsedOperatorID) || parsedOperatorID <= 0) {
    throw BadRequest("Operator ID is invalid!");
  }

  const attractionID = Number(params.attractionID);

  if (!Number.isInteger(attractionID) || attractionID <= 0) {
    throw BadRequest("Attraction ID is invalid!");
  }

  /*
   * Operatorning shu attractiondagi ochiq XReporti.
   */
  const openReport = await AttractionReportModel.findOne({
    where: {
      operator: parsedOperatorID,
      attraction: attractionID,
      status: AttractionReportStatusTypes.OPEN,
      report_type: AttractionReportTypes.XREPORT,
    },
    order: [["id", "DESC"]],
  });

  if (!openReport) {
    return null;
  }

  /*
   * Shu XReportdagi current ochiq round.
   */
  const round = await AttractionRoundModel.findOne({
    where: {
      report: Number(openReport.id),
      attraction: attractionID,
      operator: parsedOperatorID,
      status: AttractionRoundStatusTypes.OPEN,
    },

    include: [
      {
        model: EmployeeModel,
        as: "operators",
      },

      {
        model: AttractionModel,
        as: "attractions",
      },
    ],

    order: [
      ["round_number", "DESC"],
      ["id", "DESC"],
    ],
  });

  if (!round) {
    return null;
  }

  /*
   * Roundga biriktirilgan transaction IDlar.
   */
  const transactionIDs = Array.isArray(round.transactions)
    ? [
        ...new Set(
          round.transactions
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ]
    : [];

  const transactionMap = await LoadAttractionRoundTransactions(transactionIDs);

  /*
   * Database orderiga emas,
   * round.transactions array tartibiga qaytaramiz.
   */
  const transactionData = transactionIDs
    .map((transactionID) => transactionMap.get(transactionID))
    .filter(
      (transaction): transaction is AttractionRoundTransactionPlain =>
        transaction !== undefined,
    );

  const roundData = round.get({
    plain: true,
  }) as AttractionRoundWithRelationsPlain;

  return AttractionRoundDTO(roundData, transactionData);
};

export const GetTodayAttractionRoundsService = async (
  operatorID: number,
  params: AttractionRoundParams,
): Promise<AttractionRoundResponseDTO[]> => {
  const parsedOperatorID = Number(operatorID);

  if (!Number.isInteger(parsedOperatorID) || parsedOperatorID <= 0) {
    throw BadRequest("Operator ID is invalid!");
  }

  const attractionID = Number(params.attractionID);

  if (!Number.isInteger(attractionID) || attractionID <= 0) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const { startDate, endDate } = getTashkentDayRangeUTC();

  const rounds = await AttractionRoundModel.findAll({
    where: {
      operator: parsedOperatorID,
      attraction: attractionID,

      status: {
        [Op.in]: [
          AttractionRoundStatusTypes.OPEN,
          AttractionRoundStatusTypes.FINISHED,
        ],
      },

      started_at: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
    },

    order: [
      ["round_number", "ASC"],
      ["id", "ASC"],
    ],
  });

  if (rounds.length === 0) {
    return [];
  }

  const roundData = rounds.map(
    (round) =>
      round.get({
        plain: true,
      }) as AttractionRoundWithRelationsPlain,
  );

  const transactionIDs = [
    ...new Set(
      roundData.flatMap((round) => {
        if (!Array.isArray(round.transactions)) {
          return [];
        }

        return round.transactions
          .map(Number)
          .filter(
            (transactionID) =>
              Number.isInteger(transactionID) && transactionID > 0,
          );
      }),
    ),
  ];

  const transactionMap = await LoadAttractionRoundTransactions(transactionIDs);

  return roundData.map((round) => {
    const roundTransactionIDs = Array.isArray(round.transactions)
      ? round.transactions
          .map(Number)
          .filter(
            (transactionID) =>
              Number.isInteger(transactionID) && transactionID > 0,
          )
      : [];

    const roundTransactions = roundTransactionIDs
      .map((transactionID) => transactionMap.get(transactionID))
      .filter(
        (transaction): transaction is AttractionRoundTransactionPlain =>
          transaction !== undefined,
      );

    return AttractionRoundDTO(round, roundTransactions);
  });
};

export const GetTodayRoundsService = async (
  query: GetTodayRoundsQuery = {},
): Promise<
  AttractionRoundResponseDTO[]
> => {
  const { startDate, endDate } = getTashkentDayRangeUTC(query.date);
  const hasAttractionID = query.attractionID !== undefined;
  const attractionID = hasAttractionID ? Number(query.attractionID) : undefined;

  if (
    hasAttractionID &&
    (!Number.isInteger(attractionID) || Number(attractionID) <= 0)
  ) {
    throw BadRequest("ATTRACTION_ID_IS_INVALID");
  }

  const hasCardNumber = query.card_number !== undefined;
  const cardNumber = hasCardNumber ? query.card_number!.trim() : undefined;

  if (hasCardNumber && !cardNumber) {
    throw BadRequest("CARD_NUMBER_IS_INVALID");
  }

  const rounds = await AttractionRoundModel.findAll({
    where: {
      status: {
        [Op.in]: [
          AttractionRoundStatusTypes.OPEN,
          AttractionRoundStatusTypes.FINISHED,
        ],
      },
      started_at: {
        [Op.between]: [startDate, endDate],
      },
      ...(attractionID !== undefined ? { attraction: attractionID } : {}),
    },

    include: [
      {
        model: EmployeeModel,
        as: "operators",
      },

      {
        model: AttractionModel,
        as: "attractions",
        paranoid: false,
      },
    ],

    order: [
      ["attraction", "ASC"],
      ["round_number", "ASC"],
      ["id", "ASC"],
    ],
  });

  if (rounds.length === 0) {
    return [];
  }

  const roundData = rounds.map(
    (round) =>
      round.get({
        plain: true,
      }) as AttractionRoundWithRelationsPlain,
  );

  /*
   * Barcha roundlardagi transaction IDlarni yig‘amiz.
   */
  const transactionIDs = [
    ...new Set(
      roundData.flatMap((round) => {
        if (!Array.isArray(round.transactions)) {
          return [];
        }

        return round.transactions
          .map(Number)
          .filter(
            (transactionID) =>
              Number.isInteger(transactionID) && transactionID > 0,
          );
      }),
    ),
  ];

  /*
   * Barcha transactionlar uchun faqat bitta query.
   */
  const transactionMap = await LoadAttractionRoundTransactions(
    transactionIDs,
    cardNumber,
  );

  return roundData
    .map((round) => {
      /*
       * Har bir round uchun o‘z transactionlarini
       * round.transactions array tartibida olamiz.
       */
      const roundTransactionIDs = Array.isArray(round.transactions)
        ? round.transactions
            .map(Number)
            .filter(
              (transactionID) =>
                Number.isInteger(transactionID) && transactionID > 0,
            )
        : [];

      const roundTransactions = roundTransactionIDs
        .map((transactionID) => transactionMap.get(transactionID))
        .filter(
          (transaction): transaction is AttractionRoundTransactionPlain =>
            transaction !== undefined,
        );

      if (hasCardNumber && roundTransactions.length === 0) {
        return null;
      }

      return AttractionRoundDTO(round, roundTransactions);
    })
    .filter((round): round is AttractionRoundResponseDTO => round !== null);
};

export const CloseCurrentAttractionRoundService = async (
  operatorID: number,
  params: AttractionRoundParams,
) => {
  return await AttractionRoundModel.sequelize!.transaction(
    async (transaction) => {
      const round = await AttractionRoundModel.findOne({
        where: {
          id: params.roundID,
          operator: operatorID,
          status: AttractionRoundStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (round === null) {
        throw BadRequest("Open round not found!");
      }

      const attractionID = Number(round.attraction);

      const operatorAttraction = await AttractionOperatorModel.findOne({
        where: {
          operator: operatorID,
          attraction: attractionID,
          status: AttractionOperatorStatusTypes.ACTIVE,
        },
        include: [
          {
            model: AttractionModel,
            as: "attractions",
            required: true,
            where: {
              status: AttractionStatusTypes.ACTIVE,
            },
            attributes: ["id", "duration"],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (operatorAttraction === null) {
        throw NotFound("Operator attraction not found!");
      }

      const operatorAttractionData = operatorAttraction.get({
        plain: true,
      }) as AttractionOperatorModelI & {
        attractions: {
          id: number | string;
          duration: number | string;
        };
      };

      const xReport = await AttractionReportModel.findOne({
        where: {
          id: Number(round.report),
          operator: operatorID,
          attraction: attractionID,
          report_type: AttractionReportTypes.XREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (xReport === null) {
        throw BadRequest("Open X report required!");
      }

      if (!xReport.zreport) {
        throw BadRequest("X report is not connected to Z report!");
      }

      const zReport = await AttractionReportModel.findOne({
        where: {
          id: Number(xReport.zreport),
          attraction: attractionID,
          report_type: AttractionReportTypes.ZREPORT,
          status: AttractionReportStatusTypes.OPEN,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (zReport === null) {
        throw BadRequest("Open Z report required!");
      }

      const peopleCount = Number(round.people_count || 0);

      if (peopleCount <= 0) {
        throw BadRequest("Round has no people!");
      }

      const duration = Number(operatorAttractionData.attractions.duration || 0);

      const startedAt = new Date(round.started_at);

      const finishedAt =
        duration > 0
          ? new Date(startedAt.getTime() + duration * 60 * 1000)
          : new Date();

      await round.update(
        {
          status: AttractionRoundStatusTypes.FINISHED,
          finished_at: finishedAt,
        },
        {
          transaction,
        },
      );

      const roundTransactionIDs = Array.isArray(round.transactions)
        ? round.transactions
            .map(Number)
            .filter(
              (transactionID) =>
                Number.isInteger(transactionID) && transactionID > 0,
            )
        : [];

      const roundTransactions = roundTransactionIDs.length
        ? await CardTransactionModel.findAll({
            where: {
              id: {
                [Op.in]: roundTransactionIDs,
              },
              attraction: attractionID,
              xreport: Number(xReport.id),
              type: CardTransactionType.PAYMENT,
              status: CardTransactionStatusTypes.SUCCESS,
            },
            include: [
              {
                model: CardModel,
                as: "cards",
                required: true,
                attributes: ["type"],
              },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : [];

      const standardTotals = {
        total_people: 0,
        total_offline: 0,
        total_online: 0,
        total_virtual: 0,
        total_classic: 0,
        total_vip: 0,
        total_organization: 0,
        paid_amount: 0,
        total_amount: 0,
      };

      const promotionKeys = new Set<string>();

      for (const payment of roundTransactions) {
        const paymentData = payment.get({
          plain: true,
        }) as CardTransactionModelI & {
          cards: Pick<CardsModelI, "type">;
        };

        if (paymentData.promotion !== null) {
          promotionKeys.add(
            [
              "promotion",
              Number(paymentData.promotion),
              Number(paymentData.discount_percent || 0),
              Number(paymentData.original_unit_price || 0),
              Number(paymentData.sale_unit_price || 0),
            ].join(":"),
          );
          continue;
        }

        const paymentPeople = Number(paymentData.people_count || 0);

        standardTotals.total_people += paymentPeople;
        standardTotals.total_online +=
          paymentData.payment_type === PaymentType.ONLINE ? paymentPeople : 0;
        standardTotals.total_offline +=
          paymentData.payment_type === PaymentType.ONLINE ? 0 : paymentPeople;
        standardTotals.total_virtual +=
          paymentData.cards.type === CardType.VIRTUAL ? paymentPeople : 0;
        standardTotals.total_classic +=
          paymentData.cards.type === CardType.CLASSIC ? paymentPeople : 0;
        standardTotals.total_vip +=
          paymentData.cards.type === CardType.VIP ? paymentPeople : 0;
        standardTotals.total_organization +=
          paymentData.cards.type === CardType.ORGANIZATION ? paymentPeople : 0;
        standardTotals.paid_amount +=
          paymentData.cards.type === CardType.CLASSIC ||
          paymentData.cards.type === CardType.VIRTUAL
            ? Number(paymentData.amount || 0)
            : 0;
        standardTotals.total_amount +=
          Number(paymentData.sale_unit_price || 0) * paymentPeople;
      }

      if (standardTotals.total_people > 0) {
        await xReport.increment(
          {
            total_rounds: 1,
          },
          {
            transaction,
          },
        );

        await zReport.increment(
          {
            total_rounds: 1,
            ...standardTotals,
          },
          {
            transaction,
          },
        );
      }

      for (const promotionKey of promotionKeys) {
        const promotionReport = await PromotionReportModel.findOne({
          where: {
            attraction: attractionID,
            xreport: Number(xReport.id),
            zreport: Number(zReport.id),
            promotion_key: promotionKey,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (promotionReport) {
          await promotionReport.increment(
            {
              rounds_count: 1,
            },
            {
              transaction,
            },
          );
        }
      }

      const roundData = round.get({
        plain: true,
      }) as AttractionRoundModelI;

      return AttractionRoundDTO({
        ...roundData,
        status: AttractionRoundStatusTypes.FINISHED,
        finished_at: finishedAt,
      });
    },
  );
};
