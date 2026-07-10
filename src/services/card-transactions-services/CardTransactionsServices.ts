import { Op } from "sequelize";
import { CardDTO } from "../../dtos/card-dtos/CardDto";
import {
  CardPaymentFailedDTO,
  CardPaymentSuccessDTO,
  CardTransactionDTO,
  CardTransactionHistoryDTO,
} from "../../dtos/card-transaction-dtos/CardTransactionDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { CardBatchModel } from "../../models/postgresql/card-batches-model/CardBatchModel";
import { CardTransactionModel } from "../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";
import { CardModel } from "../../models/postgresql/cards-model/CardModel";
import {
  CardStatusTypes,
  CardType,
} from "../../models/postgresql/cards-model/enums";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { getTodayRange } from "../../utils/date";
import {
  getReportTopUpIncrementData,
  validateTopUpPaymentType,
} from "../../utils/transactionHelpers";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import {
  GetOpenAttractionReportService,
  GetOrCreateOpenAttractionRoundService,
  GetPaymentOperatorAttractionService,
} from "../attraction-reports-services/AttractionReportsServices";

export const CheckNfcCardService = async (
  operatorID: number,
  body: CheckNFCCardData,
) => {
  if (!body.nfc?.trim()) {
    throw BadRequest("NFC is required!");
  }

  const openXReport = await CashboxReportModel.findOne({
    where: {
      operator: operatorID,
      report_type: CashboxReportTypes.XREPORT,
      status: CashboxReportStatusTypes.OPEN,
    },
  });

  if (!openXReport) {
    throw BadRequest("Open X report required!");
  }

  const card = await CardModel.findOne({
    where: {
      nfc: body.nfc.trim(),
    },
    include: [
      {
        model: CardBatchModel,
        as: "batches",
        required: false,
        attributes: ["id", "name"],
      },
    ],
  });

  if (!card) {
    throw NotFound("Card not found!");
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

  if (card.type === CardType.VIP) {
    throw BadRequest("VIP cards cannot be topped up!");
  }

  if (card.type === CardType.ORGANIZATION && Number(card.balance) > 12000) {
    throw BadRequest(
      "Organization card balance must be less than 12,000 to allow top-up.",
    );
  }

  const lastTransaction = await CardTransactionModel.findOne({
    where: {
      card: card.id,
      status: CardTransactionStatusTypes.SUCCESS,
    },
    order: [["id", "DESC"]],
  });

  const cardData = card.get({
    plain: true,
  }) as CardWithTransactionDto;

  return CardDTO({
    ...cardData,
    transaction: lastTransaction
      ? lastTransaction.get({
          plain: true,
        })
      : null,
  });
};

export const CardTopUpTransactionService = async (
  operatorID: number,
  body: CardTopUpTransactionData,
): Promise<CardTransactionResponseDTO> => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  if (!body.nfc?.trim()) {
    throw BadRequest("NFC is required!");
  }

  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw BadRequest("Amount must be greater than 0!");
  }

  if (!body.payment_type) {
    throw BadRequest("Payment type is required!");
  }

  validateTopUpPaymentType(body);

  const sequelize = CardTransactionModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const openXReport = await CashboxReportModel.findOne({
      where: {
        operator: operatorID,
        report_type: CashboxReportTypes.XREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!openXReport) {
      throw BadRequest("Open X report required!");
    }

    if (!openXReport.zreport) {
      throw BadRequest("Z report is required!");
    }

    const card = await CardModel.findOne({
      where: {
        nfc: body.nfc.trim(),
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("Card not found!");
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

    /*
     * VIP kartani to‘ldirish mumkin emas.
     */
    if (card.type === CardType.VIP) {
      throw BadRequest("VIP cards cannot be topped up!");
    }

    const balanceBefore = Number(card.balance || 0);

    /*
     * Organization kartani faqat joriy balansi
     * 12 000 dan kam bo‘lsa to‘ldirish mumkin.
     */
    if (card.type === CardType.ORGANIZATION && balanceBefore > 12000) {
      throw BadRequest(
        "Organization card balance must be less than 12,000 to allow top-up!",
      );
    }

    const balanceAfter = balanceBefore + amount;
    const isCardActivated = card.status === CardStatusTypes.INACTIVE;
    const isOrganizationCard = card.type === CardType.ORGANIZATION;

    const cardTransaction = await CardTransactionModel.create(
      {
        card: Number(card.id),
        operator: operatorID,
        xreport: Number(openXReport.id),
        cashbox: Number(openXReport.cashbox),
        type: CardTransactionType.TOPUP,
        payment_type: body.payment_type,
        payment_card_type:
          body.payment_type === PaymentType.CARD
            ? body.payment_card_type!
            : null,
        payment_service:
          body.payment_type === PaymentType.ONLINE
            ? body.payment_service_type!
            : null,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      {
        transaction: dbTransaction,
      },
    );

    /*
     * Card modeldagi balance yangilanadi.
     *
     * Organization karta to‘ldirilsa:
     * organization -> classic bo‘ladi.
     *
     * Inactive karta birinchi top-upda active bo‘ladi.
     */
    await card.update(
      {
        balance: balanceAfter,
        ...(isOrganizationCard ? { type: CardType.CLASSIC } : {}),
        ...(isCardActivated
          ? {
              status: CardStatusTypes.ACTIVE,
              activated_at: new Date(),
            }
          : {}),
      },
      {
        transaction: dbTransaction,
      },
    );

    const incrementData = getReportTopUpIncrementData(
      body,
      amount,
      isCardActivated,
    );

    await CashboxReportModel.increment(incrementData, {
      where: {
        id: openXReport.id,
      },
      transaction: dbTransaction,
    });

    await CashboxReportModel.increment(incrementData, {
      where: {
        id: openXReport.zreport,
      },
      transaction: dbTransaction,
    });

    if (isCardActivated) {
      await CardBatchModel.increment(
        {
          active_cards: 1,
          inactive_cards: -1,
        },
        {
          where: {
            id: card.batch,
          },
          transaction: dbTransaction,
        },
      );
    }

    return CardTransactionDTO({
      ...cardTransaction.get({
        plain: true,
      }),

      card_data: card.get({
        plain: true,
      }),
    });
  });
};

export const GetCardTransactionsService = async (
  operatorID: number,
  params: CashboxReportsParams,
  query: GetCashboxCardTransactionsQuery,
) => {
  if (!operatorID) {
    throw BadRequest("Operator is required!");
  }

  const cashboxID = Number(params.cashboxID);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  const { start, end } = getTodayRange();

  const { rows, count } = await CardTransactionModel.findAndCountAll({
    where: {
      cashbox: cashboxID,
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: CardModel,
        as: "cards",
        required: false,
        attributes: ["id", "card", "nfc", "status"],
      },
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
        attributes: ["id", "firstname", "lastname", "file"],
      },
    ],
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  const transactions = rows.map((transaction) =>
    CardTransactionHistoryDTO(
      transaction.get({ plain: true }) as CardTransactionHistoryPlain,
    ),
  );

  return {
    transactions,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CardPaymentTransactionService = async (
  operatorID: number,
  body: CardPaymentTransactionData,
) => {
  if (!body.nfc || !body.nfc.trim()) {
    throw BadRequest("NFC is required!");
  }

  const attractionID = Number(body.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  return await CardTransactionModel.sequelize!.transaction(
    async (transaction) => {
      const operatorAttraction = await GetPaymentOperatorAttractionService(
        operatorID,
        attractionID,
        transaction,
      );

      const attraction = operatorAttraction.attractions;
      const amount = Number(attraction.price);
      const seats = Number(attraction.seats);

      const report = await GetOpenAttractionReportService(
        operatorID,
        attractionID,
        transaction,
      );

      if (report === null) {
        throw BadRequest("Open report required!");
      }

      const round = await GetOrCreateOpenAttractionRoundService(
        report,
        attractionID,
        operatorID,
        transaction,
      );

      if (Number(round.people_count) >= seats) {
        return CardPaymentFailedDTO("Round is full. Press GO first!");
      }

      const card = await CardModel.findOne({
        where: {
          nfc: body.nfc.trim(),
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (card === null) {
        return NotFound("Card not found!");
      }

      if (card.status !== CardStatusTypes.ACTIVE) {
        return Conflict("Card is not active!");
      }

      const lastTransaction = await CardTransactionModel.findOne({
        where: {
          card: Number(card.id),
          status: CardTransactionStatusTypes.SUCCESS,
        },
        order: [["id", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const balanceBefore =
        lastTransaction !== null ? Number(lastTransaction.balance_after) : 0;

      if (balanceBefore < amount) {
        return CardPaymentFailedDTO("Not enough balance!");
      }

      const balanceAfter = balanceBefore - amount;

      const payment = await CardTransactionModel.create(
        {
          card: Number(card.id),
          operator: operatorID,
          cashbox: null,
          attraction: attractionID,
          xreport: null,
          type: CardTransactionType.PAYMENT,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          payment_type: PaymentType.CARD,
          payment_card_type: null,
          payment_service: null,

          status: CardTransactionStatusTypes.SUCCESS,
        },
        {
          transaction,
        },
      );

      await round.update(
        {
          people_count: Number(round.people_count) + 1,
          paid_amount: Number(round.paid_amount) + amount,
          total_amount: Number(round.total_amount) + amount,
        },
        {
          transaction,
        },
      );

      const paymentData = payment.get({
        plain: true,
      }) as CardTransactionModelI;

      const cardData = card.get({
        plain: true,
      }) as CardsModelI;

      return CardPaymentSuccessDTO({
        ...paymentData,
        card_data: cardData,
      });
    },
  );
};
