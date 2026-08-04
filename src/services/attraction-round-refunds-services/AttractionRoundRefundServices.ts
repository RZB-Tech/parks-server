import { Op, WhereOptions } from "sequelize";
import {
  AttractionRoundRefundDTO,
  AttractionRoundRefundsDTO,
} from "../../dtos/attraction-round-refunds-dtos/AttractionRoundRefundDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { AttractionRoundRefundModel } from "../../models/postgresql/attraction-round-refund-model/AttractionRoundRefundModel";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { AttractionReportTypes } from "../../models/postgresql/attraction-model/enums";
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
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { PromotionReportModel } from "../../models/postgresql/promotion-reports-model/PromotionReportsModel";
import {
  getTashkentDayRangeUTC,
  getTashkentRangeUTC,
} from "../../utils/date";

type NumericCounters = Record<string, number>;

const EmptyRoundRefundCounters = (): NumericCounters => ({
  people_count: 0,
  offline_count: 0,
  online_count: 0,
  virtual_count: 0,
  classic_count: 0,
  vip_count: 0,
  organization_count: 0,
  paid_amount: 0,
  total_amount: 0,
});

const EmptyReportRefundCounters = (): NumericCounters => ({
  total_people: 0,
  total_offline: 0,
  total_online: 0,
  total_virtual: 0,
  total_classic: 0,
  total_vip: 0,
  total_organization: 0,
  paid_amount: 0,
  total_amount: 0,
});

const EmptyPromotionRefundCounters = (): NumericCounters => ({
  total_people: 0,
  total_virtual: 0,
  total_classic: 0,
  total_vip: 0,
  total_organization: 0,
  total_online: 0,
  total_offline: 0,
  original_amount: 0,
  discount_amount: 0,
  total_amount: 0,
  paid_amount: 0,
});

const DecrementedCounterValues = (
  source: object,
  counters: NumericCounters,
  errorMessage: string,
) => {
  const values: NumericCounters = {};

  for (const [field, decrement] of Object.entries(counters)) {
    const current = Number((source as Record<string, unknown>)[field] ?? 0);
    const next = current - decrement;

    if (
      !Number.isSafeInteger(current) ||
      !Number.isSafeInteger(decrement) ||
      decrement < 0 ||
      !Number.isSafeInteger(next) ||
      next < 0
    ) {
      throw Conflict(errorMessage);
    }

    values[field] = next;
  }

  return values;
};

const AddPaymentRefundCounters = (
  target: NumericCounters,
  payment: CardTransactionModelI,
  cardType: CardType,
  roundCounters: boolean,
) => {
  const peopleCount = Number(payment.people_count || 0);
  const amount = Number(payment.amount || 0);
  const totalAmount = Number(payment.sale_unit_price || 0) * peopleCount;
  const isOnline = payment.payment_type === PaymentType.ONLINE;
  const paidAmount =
    cardType === CardType.CLASSIC || cardType === CardType.VIRTUAL ? amount : 0;

  if (
    !Number.isSafeInteger(peopleCount) ||
    peopleCount <= 0 ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(totalAmount) ||
    totalAmount < 0
  ) {
    throw Conflict("REFUND_TRANSACTION_TOTALS_ARE_INVALID");
  }

  const peopleField = roundCounters ? "people_count" : "total_people";
  const offlineField = roundCounters ? "offline_count" : "total_offline";
  const onlineField = roundCounters ? "online_count" : "total_online";
  const virtualField = roundCounters ? "virtual_count" : "total_virtual";
  const classicField = roundCounters ? "classic_count" : "total_classic";
  const vipField = roundCounters ? "vip_count" : "total_vip";
  const organizationField = roundCounters
    ? "organization_count"
    : "total_organization";

  target[peopleField] += peopleCount;
  target[offlineField] += isOnline ? 0 : peopleCount;
  target[onlineField] += isOnline ? peopleCount : 0;
  target[virtualField] += cardType === CardType.VIRTUAL ? peopleCount : 0;
  target[classicField] += cardType === CardType.CLASSIC ? peopleCount : 0;
  target[vipField] += cardType === CardType.VIP ? peopleCount : 0;
  target[organizationField] +=
    cardType === CardType.ORGANIZATION ? peopleCount : 0;
  target.paid_amount += paidAmount;
  target.total_amount += totalAmount;

  return {
    peopleCount,
    amount,
    totalAmount,
    paidAmount,
    isOnline,
  };
};

export const GetAttractionRoundRefundsService = async (
  operatorID: number,
  query: GetAttractionRoundRefundsQuery,
): Promise<GetAttractionRoundRefundsResponseDTO> => {
  const parsedOperatorID = Number(operatorID);

  if (!Number.isInteger(parsedOperatorID) || parsedOperatorID <= 0) {
    throw BadRequest("OPERATOR_ID_IS_INVALID");
  }

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (!Number.isInteger(page) || page <= 0) {
    throw BadRequest("PAGE_IS_INVALID");
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw BadRequest("LIMIT_IS_INVALID");
  }

  const hasDate = query.date !== undefined;
  const hasFromDate = query.from_date !== undefined;
  const hasToDate = query.to_date !== undefined;

  if (hasDate && (hasFromDate || hasToDate)) {
    throw BadRequest("DATE_AND_DATE_RANGE_CANNOT_BE_USED_TOGETHER");
  }

  let startDate: Date;
  let endDate: Date;

  if (hasFromDate || hasToDate) {
    if (!hasFromDate || !hasToDate) {
      throw BadRequest("FROM_DATE_AND_TO_DATE_ARE_REQUIRED_TOGETHER");
    }

    const fromDate = query.from_date!.trim();
    const toDate = query.to_date!.trim();

    if (!fromDate || !toDate) {
      throw BadRequest("DATE_RANGE_IS_INVALID");
    }

    ({ startDate, endDate } = getTashkentRangeUTC(fromDate, toDate));
  } else {
    const date = hasDate ? query.date!.trim() : undefined;

    if (hasDate && !date) {
      throw BadRequest("DATE_IS_INVALID");
    }

    ({ startDate, endDate } = getTashkentDayRangeUTC(date));
  }

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

  const where: WhereOptions<AttractionRoundRefundModelI> = {
    createdAt: {
      [Op.between]: [startDate, endDate],
    },
    ...(attractionID !== undefined ? { attraction: attractionID } : {}),
  };

  const { rows, count } = await AttractionRoundRefundModel.findAndCountAll({
    where,
    include: [
      {
        model: AttractionRoundModel,
        as: "rounds",
        required: false,
      },
      {
        model: AttractionModel,
        as: "attractions",
        required: false,
      },
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
      },
      {
        model: CardModel,
        as: "cards",
        required: hasCardNumber,
        ...(cardNumber ? { where: { card: cardNumber } } : {}),
      },
      {
        model: CardTransactionModel,
        as: "original_transactions",
        required: false,
      },
      {
        model: CardTransactionModel,
        as: "refund_transactions",
        required: false,
      },
    ],
    distinct: true,
    limit,
    offset: (page - 1) * limit,
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });

  return AttractionRoundRefundsDTO(
    rows.map(
      (refund) =>
        refund.get({ plain: true }) as AttractionRoundRefundListPlain,
    ),
    {
      total: count,
      page,
      limit,
    },
  );
};

export const RefundFinishedAttractionRoundService = async (
  operatorID: number,
  params: AttractionRoundRefundParams,
  body: RefundAttractionRoundData,
): Promise<AttractionRoundRefundResponseDTO> => {
  const parsedOperatorID = Number(operatorID);
  const attractionID = Number(params.attractionID);
  const roundID = Number(params.roundID);
  const cardID = Number(body.card_id);
  const description = body.description?.trim();
  const transactionIDs = Array.isArray(body.transactionIDs)
    ? body.transactionIDs.map(Number)
    : [];

  if (new Set(transactionIDs).size !== transactionIDs.length) {
    throw BadRequest("DUPLICATE_TRANSACTION_IDS_ARE_NOT_ALLOWED");
  }

  if (!description || description.length < 3 || description.length > 500) {
    throw BadRequest("REFUND_DESCRIPTION_IS_INVALID");
  }

  const sequelize = AttractionRoundModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    const round = await AttractionRoundModel.findOne({
      where: {
        id: roundID,
        attraction: attractionID,
        operator: parsedOperatorID,
        status: AttractionRoundStatusTypes.FINISHED,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!round) {
      throw NotFound("FINISHED_ROUND_NOT_FOUND");
    }

    const roundTransactionIDs = Array.isArray(round.transactions)
      ? round.transactions
          .map(Number)
          .filter(
            (transactionID) =>
              Number.isInteger(transactionID) && transactionID > 0,
          )
      : [];
    const roundTransactionSet = new Set(roundTransactionIDs);

    if (
      transactionIDs.some(
        (transactionID) => !roundTransactionSet.has(transactionID),
      )
    ) {
      throw BadRequest("TRANSACTION_DOES_NOT_BELONG_TO_ROUND");
    }

    const xReport = await AttractionReportModel.findOne({
      where: {
        id: Number(round.report),
        attraction: attractionID,
        operator: parsedOperatorID,
        report_type: AttractionReportTypes.XREPORT,
        status: AttractionReportStatusTypes.OPEN,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!xReport || !xReport.zreport) {
      throw Conflict("OPEN_X_REPORT_REQUIRED_FOR_REFUND");
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

    if (!zReport) {
      throw Conflict("OPEN_Z_REPORT_REQUIRED_FOR_REFUND");
    }

    const card = await CardModel.findByPk(cardID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!card) {
      throw NotFound("CARD_NOT_FOUND");
    }

    if (card.status === CardStatusTypes.RETURNED) {
      throw Conflict("RETURNED_CARD_CANNOT_BE_REFUNDED");
    }

    const payments = await CardTransactionModel.findAll({
      where: {
        id: {
          [Op.in]: transactionIDs,
        },
      },
      order: [["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (payments.length !== transactionIDs.length) {
      throw NotFound("SOME_PAYMENT_TRANSACTIONS_WERE_NOT_FOUND");
    }

    const paymentMap = new Map(
      payments.map((payment) => [Number(payment.id), payment]),
    );
    const orderedPayments = transactionIDs.map(
      (transactionID) => paymentMap.get(transactionID)!,
    );

    for (const payment of orderedPayments) {
      if (
        payment.type !== CardTransactionType.PAYMENT ||
        payment.status !== CardTransactionStatusTypes.SUCCESS
      ) {
        throw Conflict("TRANSACTION_IS_NOT_REFUNDABLE");
      }

      if (
        Number(payment.card) !== cardID ||
        Number(payment.attraction) !== attractionID ||
        Number(payment.xreport) !== Number(xReport.id)
      ) {
        throw BadRequest("TRANSACTION_REFUND_CONTEXT_MISMATCH");
      }
    }

    const existingRefunds = await AttractionRoundRefundModel.findAll({
      where: {
        original_transaction: {
          [Op.in]: transactionIDs,
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingRefunds.length > 0) {
      throw Conflict("TRANSACTION_ALREADY_REFUNDED");
    }

    const roundCounters = EmptyRoundRefundCounters();
    const standardReportCounters = EmptyReportRefundCounters();
    const promotionCounters = new Map<string, NumericCounters>();
    let refundedAmount = 0;
    let refundedPeople = 0;

    for (const payment of orderedPayments) {
      const totals = AddPaymentRefundCounters(
        roundCounters,
        payment,
        card.type,
        true,
      );

      refundedAmount += totals.amount;
      refundedPeople += totals.peopleCount;

      if (payment.promotion === null) {
        AddPaymentRefundCounters(
          standardReportCounters,
          payment,
          card.type,
          false,
        );
        continue;
      }

      const promotionKey = [
        "promotion",
        Number(payment.promotion),
        Number(payment.discount_percent || 0),
        Number(payment.original_unit_price || 0),
        Number(payment.sale_unit_price || 0),
      ].join(":");
      const counters =
        promotionCounters.get(promotionKey) ?? EmptyPromotionRefundCounters();

      counters.total_people += totals.peopleCount;
      counters.total_virtual +=
        card.type === CardType.VIRTUAL ? totals.peopleCount : 0;
      counters.total_classic +=
        card.type === CardType.CLASSIC ? totals.peopleCount : 0;
      counters.total_vip += card.type === CardType.VIP ? totals.peopleCount : 0;
      counters.total_organization +=
        card.type === CardType.ORGANIZATION ? totals.peopleCount : 0;
      counters.total_online += totals.isOnline ? totals.peopleCount : 0;
      counters.total_offline += totals.isOnline ? 0 : totals.peopleCount;
      counters.original_amount += Number(payment.original_amount || 0);
      counters.discount_amount += Number(payment.discount_amount || 0);
      counters.total_amount += totals.totalAmount;
      counters.paid_amount += totals.paidAmount;

      promotionCounters.set(promotionKey, counters);
    }

    if (
      !Number.isSafeInteger(refundedAmount) ||
      refundedAmount < 0 ||
      !Number.isSafeInteger(refundedPeople) ||
      refundedPeople <= 0
    ) {
      throw Conflict("REFUND_TOTALS_ARE_INVALID");
    }

    const roundUpdate = DecrementedCounterValues(
      round,
      roundCounters,
      "ROUND_TOTALS_MISMATCH",
    );
    const hasStandardPayments = standardReportCounters.total_people > 0;
    const xReportUpdate = hasStandardPayments
      ? DecrementedCounterValues(
          xReport,
          standardReportCounters,
          "X_REPORT_TOTALS_MISMATCH",
        )
      : null;
    const zReportUpdate = hasStandardPayments
      ? DecrementedCounterValues(
          zReport,
          standardReportCounters,
          "Z_REPORT_TOTALS_MISMATCH",
        )
      : null;
    const promotionUpdates: Array<{
      report: PromotionReportModel;
      values: NumericCounters;
    }> = [];

    for (const [promotionKey, counters] of promotionCounters.entries()) {
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

      if (!promotionReport) {
        throw Conflict("PROMOTION_REPORT_NOT_FOUND_FOR_REFUND");
      }

      promotionUpdates.push({
        report: promotionReport,
        values: DecrementedCounterValues(
          promotionReport,
          counters,
          "PROMOTION_REPORT_TOTALS_MISMATCH",
        ),
      });
    }

    const balanceBefore = Number(card.balance || 0);

    if (!Number.isSafeInteger(balanceBefore) || balanceBefore < 0) {
      throw Conflict("CARD_BALANCE_IS_INVALID");
    }

    const [cancelledPayments] = await CardTransactionModel.update(
      {
        status: CardTransactionStatusTypes.CANCELLED,
      },
      {
        where: {
          id: {
            [Op.in]: transactionIDs,
          },
          type: CardTransactionType.PAYMENT,
          status: CardTransactionStatusTypes.SUCCESS,
        },
        transaction,
      },
    );

    if (cancelledPayments !== transactionIDs.length) {
      throw Conflict("SOME_TRANSACTIONS_WERE_ALREADY_REFUNDED");
    }

    let nextBalance = balanceBefore;
    const refundTransactions: CreatedAttractionRoundRefundTransactionPlain[] =
      [];
    const refundTransactionIDs: number[] = [];

    for (const payment of orderedPayments) {
      const paymentAmount = Number(payment.amount || 0);
      const paymentPeople = Number(payment.people_count || 0);
      const refundBalanceBefore = nextBalance;
      const refundBalanceAfter = refundBalanceBefore + paymentAmount;

      if (!Number.isSafeInteger(refundBalanceAfter)) {
        throw Conflict("REFUND_BALANCE_IS_INVALID");
      }

      const refundTransaction = await CardTransactionModel.create(
        {
          card: cardID,
          operator: parsedOperatorID,
          cashbox: null,
          attraction: attractionID,
          attraction_tariff: payment.attraction_tariff,
          tariff_name: payment.tariff_name,
          xreport: Number(xReport.id),
          cashbox_report: null,
          type: CardTransactionType.REFUND,
          amount: paymentAmount,
          balance_before: refundBalanceBefore,
          balance_after: refundBalanceAfter,
          activation_amount: 0,
          description,
          promotion: payment.promotion,
          promotion_code: payment.promotion_code,
          promotion_name: payment.promotion_name,
          promotion_type: payment.promotion_type,
          discount_percent: Number(payment.discount_percent || 0),
          people_count: paymentPeople,
          original_unit_price: Number(payment.original_unit_price || 0),
          sale_unit_price: Number(payment.sale_unit_price || 0),
          original_amount: Number(payment.original_amount || 0),
          discount_amount: Number(payment.discount_amount || 0),
          payment_type: payment.payment_type,
          payment_card_type: payment.payment_card_type,
          payment_service: payment.payment_service,
          status: CardTransactionStatusTypes.SUCCESS,
        },
        {
          transaction,
        },
      );

      await AttractionRoundRefundModel.create(
        {
          round: roundID,
          attraction: attractionID,
          operator: parsedOperatorID,
          card: cardID,
          original_transaction: Number(payment.id),
          refund_transaction: Number(refundTransaction.id),
          amount: paymentAmount,
          people_count: paymentPeople,
          description,
        },
        {
          transaction,
        },
      );

      nextBalance = refundBalanceAfter;
      refundTransactionIDs.push(Number(refundTransaction.id));
      refundTransactions.push({
        id: Number(refundTransaction.id),
        original_transaction: Number(payment.id),
        amount: paymentAmount,
        people_count: paymentPeople,
      });
    }

    await card.update({ balance: nextBalance }, { transaction });

    await round.update(
      {
        ...roundUpdate,
        transactions: [
          ...new Set([...roundTransactionIDs, ...refundTransactionIDs]),
        ],
      },
      {
        transaction,
      },
    );

    if (xReportUpdate && zReportUpdate) {
      await xReport.update(xReportUpdate, { transaction });
      await zReport.update(zReportUpdate, { transaction });
    }

    for (const promotionUpdate of promotionUpdates) {
      await promotionUpdate.report.update(promotionUpdate.values, {
        transaction,
      });
    }

    return AttractionRoundRefundDTO({
      round: roundID,
      attraction: attractionID,
      refunded_amount: refundedAmount,
      refunded_people: refundedPeople,
      original_transaction_ids: transactionIDs,
      refund_transactions: refundTransactions,
      card: {
        id: cardID,
        balance_before: balanceBefore,
        balance_after: nextBalance,
      },
      description,
    });
  });
};
