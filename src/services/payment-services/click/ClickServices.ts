import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { CardTransactionModel } from "../../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentServiceType,
  PaymentType,
} from "../../../models/postgresql/card-transactions-model/enums";
import { CardStatusTypes } from "../../../models/postgresql/cards-model/enums";
import { ClickTransactionStatusTypes } from "../../../models/postgresql/click-transactions-model/enums";
import {
  ClickTransactionModel,
  PaymentOrderModel,
  CardModel,
  sequelize,
} from "../../../plugins/db/postgresql/db";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "../../../models/postgresql/payment-orders-model/enums";
import { AddOnlinePaymentToDailyZReportService } from "../OnlinePaymentReportServices";
import {
  ClickErrorResponse,
  ClickErrors,
  ClickSuccessResponse,
} from "../../../exceptions/click/ClickExceptions";

type ClickBody = Record<string, unknown>;

const value = (body: ClickBody, key: string) => {
  const item = body[key];
  return typeof item === "string" || typeof item === "number"
    ? String(item)
    : "";
};

const safeEqual = (first: string, second: string) => {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
};

const signature = (source: string) =>
  createHash("md5").update(source, "utf8").digest("hex");

const parseAmount = (rawAmount: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) return null;
  const parsed = Number(rawAmount);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasFields = (body: ClickBody, fields: string[]) =>
  fields.every(
    (field) =>
      Object.prototype.hasOwnProperty.call(body, field) &&
      (typeof body[field] === "string" || typeof body[field] === "number"),
  );

const validService = (body: ClickBody) => {
  const serviceID = process.env.CLICK_SERVICE_ID;
  return Boolean(serviceID) && safeEqual(value(body, "service_id"), serviceID!);
};

const validPrepareSign = (body: ClickBody) => {
  const secret = process.env.CLICK_SECRET_KEY;
  if (!secret) return false;
  const source = [
    value(body, "click_trans_id"),
    value(body, "service_id"),
    secret,
    value(body, "merchant_trans_id"),
    value(body, "amount"),
    value(body, "action"),
    value(body, "sign_time"),
  ].join("");
  return safeEqual(signature(source), value(body, "sign_string").toLowerCase());
};

const validCompleteSign = (body: ClickBody) => {
  const secret = process.env.CLICK_SECRET_KEY;
  if (!secret) return false;
  const source = [
    value(body, "click_trans_id"),
    value(body, "service_id"),
    secret,
    value(body, "merchant_trans_id"),
    value(body, "merchant_prepare_id"),
    value(body, "amount"),
    value(body, "action"),
    value(body, "sign_time"),
  ].join("");
  return safeEqual(signature(source), value(body, "sign_string").toLowerCase());
};

export const PrepareClickTransactionService = async (body: ClickBody) => {
  if (
    !hasFields(body, [
      "click_trans_id",
      "service_id",
      "click_paydoc_id",
      "merchant_trans_id",
      "amount",
      "action",
      "error",
      "error_note",
      "sign_time",
      "sign_string",
    ])
  ) {
    return ClickErrorResponse(body, ClickErrors.invalidRequest());
  }
  if (value(body, "action") !== "0") {
    return ClickErrorResponse(body, ClickErrors.invalidAction());
  }
  if (!validService(body) || !validPrepareSign(body)) {
    return ClickErrorResponse(body, ClickErrors.signFailed());
  }

  const amount = parseAmount(value(body, "amount"));
  const orderID = value(body, "merchant_trans_id");
  if (!amount) return ClickErrorResponse(body, ClickErrors.invalidAmount());
  if (!/^\d+$/.test(orderID)) {
    return ClickErrorResponse(body, ClickErrors.orderNotFound());
  }

  return sequelize.transaction(async (dbTransaction) => {
    const order = await PaymentOrderModel.findByPk(orderID, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!order) return ClickErrorResponse(body, ClickErrors.orderNotFound());
    if (Number(order.amount) !== amount) {
      return ClickErrorResponse(body, ClickErrors.invalidAmount());
    }

    const clickTransID = value(body, "click_trans_id");
    const existing = await ClickTransactionModel.findOne({
      where: { click_trans_id: clickTransID },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (existing) {
      if (
        String(existing.payment_order) !== String(order.id) ||
        Number(existing.amount) !== amount
      ) {
        return ClickErrorResponse(body, ClickErrors.invalidRequest());
      }
      return ClickSuccessResponse(body, {
        merchant_prepare_id: Number(existing.merchant_prepare_id),
      });
    }

    if (
      order.provider !== PaymentProviderTypes.CLICK ||
      order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP ||
      order.status !== PaymentOrderStatusTypes.PENDING
    ) {
      return ClickErrorResponse(body, ClickErrors.alreadyPaid());
    }
    if (order.expires_at && order.expires_at.getTime() <= Date.now()) {
      await order.update(
        { status: PaymentOrderStatusTypes.EXPIRED },
        { transaction: dbTransaction },
      );
      return ClickErrorResponse(body, ClickErrors.cancelled());
    }

    const card = await CardModel.findByPk(order.card, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (
      !card ||
      card.status !== CardStatusTypes.ACTIVE ||
      card.user === null ||
      String(card.user) !== String(order.user)
    ) {
      return ClickErrorResponse(body, ClickErrors.orderNotFound());
    }

    const preparedAt = new Date();
    const transaction = await ClickTransactionModel.create(
      {
        payment_order: Number(order.id),
        card_transaction: null,
        click_trans_id: clickTransID,
        click_paydoc_id: value(body, "click_paydoc_id"),
        merchant_prepare_id: randomUUID(),
        amount,
        status: ClickTransactionStatusTypes.PREPARED,
        error: null,
        error_note: null,
        prepared_at: preparedAt,
        completed_at: null,
        cancelled_at: null,
      },
      { transaction: dbTransaction },
    );
    const merchantPrepareID = String(transaction.id);
    await transaction.update(
      { merchant_prepare_id: merchantPrepareID },
      { transaction: dbTransaction },
    );
    await order.update(
      { status: PaymentOrderStatusTypes.PROCESSING },
      { transaction: dbTransaction },
    );

    return ClickSuccessResponse(body, {
      merchant_prepare_id: Number(merchantPrepareID),
    });
  });
};

export const CompleteClickTransactionService = async (body: ClickBody) => {
  if (
    !hasFields(body, [
      "click_trans_id",
      "service_id",
      "click_paydoc_id",
      "merchant_trans_id",
      "merchant_prepare_id",
      "amount",
      "action",
      "error",
      "error_note",
      "sign_time",
      "sign_string",
    ])
  ) {
    return ClickErrorResponse(body, ClickErrors.invalidRequest());
  }
  if (value(body, "action") !== "1") {
    return ClickErrorResponse(body, ClickErrors.invalidAction());
  }
  if (!validService(body) || !validCompleteSign(body)) {
    return ClickErrorResponse(body, ClickErrors.signFailed());
  }

  const amount = parseAmount(value(body, "amount"));
  if (!amount) return ClickErrorResponse(body, ClickErrors.invalidAmount());

  return sequelize.transaction(async (dbTransaction) => {
    const transactionSnapshot = await ClickTransactionModel.findOne({
      where: { click_trans_id: value(body, "click_trans_id") },
      transaction: dbTransaction,
    });
    if (!transactionSnapshot) {
      return ClickErrorResponse(body, ClickErrors.transactionNotFound());
    }

    const order = await PaymentOrderModel.findByPk(
      transactionSnapshot.payment_order,
      { transaction: dbTransaction, lock: dbTransaction.LOCK.UPDATE },
    );
    if (!order) return ClickErrorResponse(body, ClickErrors.orderNotFound());

    const clickTransaction = await ClickTransactionModel.findOne({
      where: { click_trans_id: value(body, "click_trans_id") },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (!clickTransaction) {
      return ClickErrorResponse(body, ClickErrors.transactionNotFound());
    }
    if (
      clickTransaction.merchant_prepare_id !==
        value(body, "merchant_prepare_id") ||
      String(clickTransaction.payment_order) !==
        value(body, "merchant_trans_id")
    ) {
      return ClickErrorResponse(body, ClickErrors.transactionNotFound());
    }
    if (Number(clickTransaction.amount) !== amount) {
      return ClickErrorResponse(body, ClickErrors.invalidAmount());
    }
    if (clickTransaction.status === ClickTransactionStatusTypes.COMPLETED) {
      return ClickSuccessResponse(body, {
        merchant_confirm_id: Number(clickTransaction.id),
      });
    }
    if (clickTransaction.status === ClickTransactionStatusTypes.CANCELLED) {
      return ClickErrorResponse(body, ClickErrors.cancelled());
    }

    const clickError = Number(value(body, "error"));
    if (!Number.isInteger(clickError)) {
      return ClickErrorResponse(body, ClickErrors.invalidRequest());
    }
    if (clickError !== 0) {
      const cancelledAt = new Date();
      await clickTransaction.update(
        {
          status: ClickTransactionStatusTypes.CANCELLED,
          error: clickError,
          error_note: value(body, "error_note"),
          cancelled_at: cancelledAt,
        },
        { transaction: dbTransaction },
      );
      await order.update(
        {
          status: PaymentOrderStatusTypes.CANCELLED,
          cancelled_at: cancelledAt,
        },
        { transaction: dbTransaction },
      );
      return ClickErrorResponse(body, ClickErrors.cancelled());
    }

    if (
      order.status !== PaymentOrderStatusTypes.PROCESSING ||
      order.provider !== PaymentProviderTypes.CLICK ||
      order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP
    ) {
      return ClickErrorResponse(body, ClickErrors.updateFailed());
    }

    const card = await CardModel.findByPk(order.card, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    if (
      !card ||
      card.status !== CardStatusTypes.ACTIVE ||
      card.user === null ||
      String(card.user) !== String(order.user)
    ) {
      return ClickErrorResponse(body, ClickErrors.orderNotFound());
    }

    const balanceBefore = Number(card.balance);
    const balanceAfter = balanceBefore + amount;
    if (
      !Number.isSafeInteger(balanceBefore) ||
      !Number.isSafeInteger(balanceAfter)
    ) {
      return ClickErrorResponse(body, ClickErrors.updateFailed());
    }

    const onlineReport = await AddOnlinePaymentToDailyZReportService(
      PaymentServiceType.CLICK,
      amount,
      dbTransaction,
    );
    const cardTransaction = await CardTransactionModel.create(
      {
        card: Number(card.id),
        operator: null,
        cashbox: Number(onlineReport.cashbox.id),
        attraction: null,
        xreport: null,
        cashbox_report: Number(onlineReport.report.id),
        type: CardTransactionType.TOPUP,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        activation_amount: 0,
        description: "Click orqali karta balansini to‘ldirish",
        promotion: null,
        promotion_code: null,
        promotion_name: null,
        promotion_type: null,
        discount_percent: 0,
        people_count: 0,
        original_unit_price: 0,
        sale_unit_price: 0,
        original_amount: 0,
        discount_amount: 0,
        payment_type: PaymentType.ONLINE,
        payment_card_type: null,
        payment_service: PaymentServiceType.CLICK,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      { transaction: dbTransaction },
    );

    const completedAt = new Date();
    await card.update(
      { balance: balanceAfter },
      { transaction: dbTransaction },
    );
    await clickTransaction.update(
      {
        card_transaction: Number(cardTransaction.id),
        status: ClickTransactionStatusTypes.COMPLETED,
        error: 0,
        error_note: value(body, "error_note") || null,
        completed_at: completedAt,
      },
      { transaction: dbTransaction },
    );
    await order.update(
      {
        status: PaymentOrderStatusTypes.PAID,
        performed_at: completedAt,
      },
      { transaction: dbTransaction },
    );

    return ClickSuccessResponse(body, {
      merchant_confirm_id: Number(clickTransaction.id),
    });
  });
};
