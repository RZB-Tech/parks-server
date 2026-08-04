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
import {
  getTashkentDateOnly,
  getTashkentDayRangeUTC,
} from "../../utils/date";
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
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportTypes } from "../../models/postgresql/attraction-model/enums";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { UserModel } from "../../plugins/db/postgresql/db";
import { FindBestActivePromotionForAttractionService } from "../promotion-services/PromotionServices";
import { UpsertPromotionReportService } from "../promotion-reports-services/PromotionReportsServices";
import { CARD_ACTIVATION_AMOUNT } from "../../consts/card";

export const CheckNfcCardService = async (
  operatorID: number,
  body: CheckNFCCardData,
) => {
  if (!body.type) {
    throw BadRequest("Card check type is required!");
  }

  if (!["nfc", "card"].includes(body.type)) {
    throw BadRequest("Card check type must be nfc or card!");
  }

  const identifier = body.id?.trim();

  if (!identifier) {
    throw BadRequest(
      body.type === "nfc" ? "NFC ID is required!" : "Card number is required!",
    );
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

  const cardWhere =
    body.type === "nfc" ? { nfc: identifier } : { card: identifier };

  const card = await CardModel.findOne({
    where: cardWhere,
    include: [
      {
        model: CardBatchModel,
        as: "batches",
        required: false,
        attributes: ["id", "name"],
      },
      {
        model: UserModel,
        as: "users",
        required: false,
        attributes: ["id", "fullname", "phone_number", "status"],
      },
    ],
  });

  if (!card) {
    throw NotFound(
      body.type === "nfc"
        ? "Card not found by NFC!"
        : "Card not found by card number!",
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
  if (!operatorID || Number.isNaN(Number(operatorID))) {
    throw BadRequest("Operator is required!");
  }

  if (!["nfc", "card"].includes(body.type)) {
    throw BadRequest("Card check type must be nfc or card!");
  }

  const identifier = body.id?.trim();

  if (!identifier) {
    throw BadRequest(
      body.type === "nfc" ? "NFC ID is required!" : "Card number is required!",
    );
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

    const cardWhere =
      body.type === "nfc" ? { nfc: identifier } : { card: identifier };

    const card = await CardModel.findOne({
      where: cardWhere,
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound(
        body.type === "nfc"
          ? "Card not found by NFC!"
          : "Card not found by card number!",
      );
    }

    if (
      [
        CardStatusTypes.BLOCKED,
        CardStatusTypes.LOST,
        CardStatusTypes.FROZEN,
        CardStatusTypes.RETURNED,
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
     * Organization karta balansi 12 000 dan kam
     * bo‘lgandagina top-up qilish mumkin.
     */
    if (card.type === CardType.ORGANIZATION && balanceBefore >= 12000) {
      throw BadRequest(
        `Organization card balance must be less than 12,000 to allow top-up. Current balance: ${balanceBefore}`,
      );
    }

    const isCardActivated = card.status === CardStatusTypes.INACTIVE;
    const isOrganizationCard = card.type === CardType.ORGANIZATION;
    const activationAmount = isCardActivated ? CARD_ACTIVATION_AMOUNT : 0;
    const topUpAmount = amount;
    const balanceAfter = balanceBefore + topUpAmount;

    const cardTransaction = await CardTransactionModel.create(
      {
        card: Number(card.id),
        operator: operatorID,
        xreport: null,
        cashbox_report: Number(openXReport.id),
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
        amount: topUpAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        activation_amount: activationAmount,
        status: CardTransactionStatusTypes.SUCCESS,
        description: body.description?.trim() || null,
      },
      {
        transaction: dbTransaction,
      },
    );

    /*
     * Organization karta top-updan keyin Classic bo‘ladi.
     * Inactive karta birinchi top-upda Active bo‘ladi.
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
      topUpAmount,
      isCardActivated,
      activationAmount,
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

export const CardRefundTransactionService = async (
  operatorID: number,
  body: CardRefundData,
) => {
  const normalizedOperatorID = Number(operatorID);
  const oldCardNumber = body?.old_card?.trim();
  const newCardNumber = body?.new_card?.trim();
  const confirmedAmount = Number(body?.amount);

  if (!Number.isInteger(normalizedOperatorID) || normalizedOperatorID <= 0) {
    throw BadRequest("Operator is required!");
  }

  if (!oldCardNumber || !newCardNumber) {
    throw BadRequest("Old card and new card are required!");
  }

  if (oldCardNumber === newCardNumber) {
    throw BadRequest("Old card and new card must be different!");
  }

  if (!Number.isSafeInteger(confirmedAmount) || confirmedAmount < 0) {
    throw BadRequest("Card return amount is invalid!");
  }

  const description = body?.description?.trim() || null;
  const sequelize = CardTransactionModel.sequelize!;

  return sequelize.transaction(async (dbTransaction) => {
    const openXReport = await CashboxReportModel.findOne({
      where: {
        operator: normalizedOperatorID,
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

    const cards = await CardModel.findAll({
      where: {
        card: {
          [Op.in]: [oldCardNumber, newCardNumber],
        },
      },
      order: [["id", "ASC"]],
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    const oldCard = cards.find((card) => card.card === oldCardNumber);
    const newCard = cards.find((card) => card.card === newCardNumber);

    if (!oldCard) {
      throw NotFound("Old card not found!");
    }

    if (!newCard) {
      throw NotFound("New card not found!");
    }

    if (
      oldCard.type === CardType.VIRTUAL ||
      newCard.type === CardType.VIRTUAL
    ) {
      throw BadRequest("Virtual cards cannot be returned or replaced!");
    }

    if (oldCard.status !== CardStatusTypes.ACTIVE) {
      throw BadRequest("Old card must be active!");
    }

    if (newCard.status !== CardStatusTypes.INACTIVE) {
      throw BadRequest("New card must be inactive!");
    }

    if (Number(newCard.balance || 0) !== 0) {
      throw BadRequest("New card balance must be zero!");
    }

    if (oldCard.type !== newCard.type) {
      throw BadRequest("Old card and new card types must match!");
    }

    const transferAmount = Number(oldCard.balance || 0);

    if (!Number.isSafeInteger(transferAmount) || transferAmount < 0) {
      throw BadRequest("Old card balance is invalid!");
    }

    if (confirmedAmount !== transferAmount) {
      throw BadRequest("CARD_RETURN_AMOUNT_MISMATCH");
    }

    const oldUserID = oldCard.user ? Number(oldCard.user) : null;
    const returnedAt = new Date();

    await oldCard.update(
      {
        balance: 0,
        status: CardStatusTypes.RETURNED,
        returned_at: returnedAt,
        return_description: description,
        user: null,
      },
      {
        transaction: dbTransaction,
      },
    );

    await newCard.update(
      {
        balance: transferAmount,
        status: CardStatusTypes.ACTIVE,
        activated_at: returnedAt,
        returned_at: null,
        return_description: null,
        user: oldUserID,
      },
      {
        transaction: dbTransaction,
      },
    );

    if (Number(oldCard.batch) === Number(newCard.batch)) {
      await CardBatchModel.increment(
        {
          inactive_cards: -1,
          returned_cards: 1,
        },
        {
          where: {
            id: oldCard.batch,
          },
          transaction: dbTransaction,
        },
      );
    } else {
      await CardBatchModel.increment(
        {
          active_cards: -1,
          returned_cards: 1,
        },
        {
          where: {
            id: oldCard.batch,
          },
          transaction: dbTransaction,
        },
      );

      await CardBatchModel.increment(
        {
          inactive_cards: -1,
          active_cards: 1,
        },
        {
          where: {
            id: newCard.batch,
          },
          transaction: dbTransaction,
        },
      );
    }

    const reportIncrement = {
      returned_cards_count: 1,
      returned_cards_amount: transferAmount,
    };

    await CashboxReportModel.increment(reportIncrement, {
      where: {
        id: openXReport.id,
      },
      transaction: dbTransaction,
    });

    await CashboxReportModel.increment(reportIncrement, {
      where: {
        id: openXReport.zreport,
      },
      transaction: dbTransaction,
    });

    return {
      old_card: {
        id: Number(oldCard.id),
        card: oldCard.card,
        status: oldCard.status,
        balance: Number(oldCard.balance),
        returned_at: oldCard.returned_at,
        return_description: oldCard.return_description,
      },
      new_card: {
        id: Number(newCard.id),
        card: newCard.card,
        status: newCard.status,
        balance: Number(newCard.balance),
      },
      amount: transferAmount,
    };
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

  const { startDate, endDate } = getTashkentDayRangeUTC(query.date);

  const { rows, count } = await CardTransactionModel.findAndCountAll({
    where: {
      cashbox: cashboxID,
      createdAt: {
        [Op.between]: [startDate, endDate],
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
  const parsedOperatorID = Number(operatorID);

  if (!Number.isInteger(parsedOperatorID) || parsedOperatorID <= 0) {
    throw BadRequest("Operator ID is invalid!");
  }

  const nfc = body.nfc?.trim();

  if (!nfc) {
    throw BadRequest("NFC is required!");
  }

  const attractionID = Number(body.attractionID);

  if (!Number.isInteger(attractionID) || attractionID <= 0) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const sequelize = CardTransactionModel.sequelize!;

  return sequelize.transaction(async (transaction) => {
    const operatorAttraction = await GetPaymentOperatorAttractionService(
      parsedOperatorID,
      attractionID,
      transaction,
    );

    const attraction = operatorAttraction.attractions;

    if (!attraction) {
      throw NotFound("Attraction not found!");
    }

    const attractionPrice = Number(attraction.price);
    const seats = Number(attraction.seats);

    if (!Number.isSafeInteger(attractionPrice) || attractionPrice < 0) {
      throw BadRequest("Attraction price is invalid!");
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      throw BadRequest("Attraction seats count is invalid!");
    }

    const openReport = await GetOpenAttractionReportService(
      parsedOperatorID,
      attractionID,
      transaction,
    );

    if (!openReport) {
      throw BadRequest("Open report required!");
    }

    const report = await AttractionReportModel.findOne({
      where: {
        id: Number(openReport.id),
        operator: parsedOperatorID,
        attraction: attractionID,
        report_type: AttractionReportTypes.XREPORT,
        status: AttractionReportStatusTypes.OPEN,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!report) {
      throw BadRequest("Open report required!");
    }

    const xreportID = Number(report.id);
    const zreportID = Number(report.zreport);

    if (!Number.isInteger(zreportID) || zreportID <= 0) {
      throw BadRequest("X-report is not connected to Z-report!");
    }

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

    if (card.status !== CardStatusTypes.ACTIVE) {
      throw Conflict("Card is not active!");
    }

    const allowedCardTypes: CardType[] = [
      CardType.CLASSIC,
      CardType.VIP,
      CardType.ORGANIZATION,
    ];

    if (!allowedCardTypes.includes(card.type)) {
      throw BadRequest("Card type is not allowed for attraction payment!");
    }

    const isClassicCard = card.type === CardType.CLASSIC;
    const isVipCard = card.type === CardType.VIP;
    const isOrganizationCard = card.type === CardType.ORGANIZATION;

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

    const discountPercent = promotion ? Number(promotion.discount_percent) : 0;

    if (!Number.isSafeInteger(originalUnitPrice) || originalUnitPrice < 0) {
      throw BadRequest("Promotion original price is invalid!");
    }

    if (
      !Number.isSafeInteger(saleUnitPrice) ||
      saleUnitPrice < 0 ||
      saleUnitPrice > originalUnitPrice
    ) {
      throw BadRequest("Promotion discounted price is invalid!");
    }

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      throw BadRequest("Promotion discount percent is invalid!");
    }

    const peopleCount = 1;

    const originalAmount = originalUnitPrice * peopleCount;
    const saleAmount = saleUnitPrice * peopleCount;
    const discountAmount = originalAmount - saleAmount;

    if (
      !Number.isSafeInteger(originalAmount) ||
      !Number.isSafeInteger(saleAmount) ||
      !Number.isSafeInteger(discountAmount)
    ) {
      throw BadRequest("Payment amount is invalid!");
    }

    let balanceBefore = 0;
    let balanceAfter = 0;
    let chargedAmount = 0;

    if (!isVipCard) {
      const lastTransaction = await CardTransactionModel.findOne({
        where: {
          card: Number(card.id),
          status: CardTransactionStatusTypes.SUCCESS,
        },
        order: [["id", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      balanceBefore = lastTransaction
        ? Number(lastTransaction.balance_after)
        : Number(card.balance ?? 0);

      if (!Number.isFinite(balanceBefore) || balanceBefore < 0) {
        throw BadRequest("Card balance is invalid!");
      }

      if (balanceBefore < saleAmount) {
        return CardPaymentFailedDTO("Not enough balance!", balanceBefore);
      }

      chargedAmount = saleAmount;
      balanceAfter = balanceBefore - chargedAmount;
    }

    const reportPaidAmount =
      isClassicCard || card.type === CardType.VIRTUAL ? chargedAmount : 0;

    /*
     * Balance tekshirilgandan keyin round olinadi.
     * Shunda yetarli balans bo‘lmasa yangi round bekorga yaratilmaydi.
     */
    const currentRound = await GetOrCreateOpenAttractionRoundService(
      report,
      attractionID,
      parsedOperatorID,
      transaction,
    );

    const round = await AttractionRoundModel.findOne({
      where: {
        id: Number(currentRound.id),
        report: xreportID,
        attraction: attractionID,
        operator: parsedOperatorID,
        status: AttractionRoundStatusTypes.OPEN,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!round) {
      throw NotFound("Open attraction round not found!");
    }

    if (Number(round.people_count) >= seats) {
      return CardPaymentFailedDTO("Round is full. Press GO first!");
    }

    const payment = await CardTransactionModel.create(
      {
        card: Number(card.id),
        operator: parsedOperatorID,
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
        discount_percent: discountPercent,
        people_count: peopleCount,
        original_unit_price: originalUnitPrice,
        sale_unit_price: saleUnitPrice,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        payment_type: PaymentType.CARD,
        payment_card_type: null,
        payment_service: null,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      {
        transaction,
      },
    );

    /*
     * Payment promotion reportdagi odam va summa statistikalarini yangilaydi.
     * rounds_count faqat round yopilganda oshiriladi.
     */
    if (hasPromotion) {
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
          people_count: peopleCount,
          total_virtual: 0,
          total_classic: isClassicCard ? peopleCount : 0,
          total_vip: isVipCard ? peopleCount : 0,
          total_organization: isOrganizationCard ? peopleCount : 0,
          total_online: 0,
          total_offline: peopleCount,
          original_amount: originalAmount,
          discount_amount: discountAmount,
          total_amount: saleAmount,
          paid_amount: reportPaidAmount,
        },
        transaction,
      );
    }

    const currentTransactionIDs = Array.isArray(round.transactions)
      ? round.transactions.map(Number)
      : [];

    await round.update(
      {
        transactions: [...currentTransactionIDs, Number(payment.id)],
        people_count: Number(round.people_count || 0) + peopleCount,
        offline_count: Number(round.offline_count || 0) + peopleCount,
        classic_count:
          Number(round.classic_count || 0) + (isClassicCard ? peopleCount : 0),
        vip_count: Number(round.vip_count || 0) + (isVipCard ? peopleCount : 0),
        organization_count:
          Number(round.organization_count || 0) +
          (isOrganizationCard ? peopleCount : 0),
        paid_amount: Number(round.paid_amount || 0) + reportPaidAmount,
        total_amount: Number(round.total_amount || 0) + saleAmount,
      },
      {
        transaction,
      },
    );
    if (!hasPromotion) {
      await report.update(
        {
          total_people: Number(report.total_people || 0) + peopleCount,
          total_offline: Number(report.total_offline || 0) + peopleCount,
          total_classic:
            Number(report.total_classic || 0) +
            (isClassicCard ? peopleCount : 0),
          total_vip:
            Number(report.total_vip || 0) + (isVipCard ? peopleCount : 0),
          total_organization:
            Number(report.total_organization || 0) +
            (isOrganizationCard ? peopleCount : 0),
          paid_amount:
            Number(report.paid_amount || 0) + reportPaidAmount,
          total_amount: Number(report.total_amount || 0) + saleAmount,
        },
        { transaction },
      );
    }

    if (!isVipCard) {
      await card.update(
        {
          balance: balanceAfter,
        },
        {
          transaction,
        },
      );
    }

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
  });
};
