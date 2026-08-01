import axios from "axios";
import { randomUUID } from "crypto";
import { Transaction } from "sequelize";
import {
  BadRequest,
  InternalServerError,
  NotFound,
} from "../../../exceptions";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentServiceType,
  PaymentType,
} from "../../../models/postgresql/card-transactions-model/enums";
import { CardStatusTypes } from "../../../models/postgresql/cards-model/enums";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "../../../models/postgresql/payment-orders-model/enums";
import { UzumTransactionStateTypes } from "../../../models/postgresql/uzum-transactions-model/enums";
import {
  CardModel,
  CardTransactionModel,
  PaymentOrderModel,
  UzumTransactionModel,
  sequelize,
} from "../../../plugins/db/postgresql/db";
import {
  AddOnlinePaymentToDailyZReportService,
  AddOnlineRefundToDailyZReportService,
} from "../OnlinePaymentReportServices";

const GetUzumConfig = () => {
  const apiURL = process.env.UZUM_API_URL;
  const terminalID = process.env.UZUM_TERMINAL_ID;
  const apiKey = process.env.UZUM_API_KEY;

  if (!apiURL || !terminalID || !apiKey) {
    throw InternalServerError("UZUM_PAYMENT_NOT_CONFIGURED");
  }

  let parsedURL: URL;
  try {
    parsedURL = new URL(apiURL);
  } catch {
    throw InternalServerError("UZUM_API_URL_INVALID");
  }

  if (parsedURL.protocol !== "https:") {
    throw InternalServerError("UZUM_API_URL_INVALID");
  }

  return {
    apiURL: parsedURL.toString().replace(/\/+$/, ""),
    headers: {
      "X-Terminal-Id": terminalID,
      "X-API-Key": apiKey,
      "Content-Language": process.env.UZUM_CONTENT_LANGUAGE || "ru-RU",
    },
  };
};

const GetSessionTimeout = () => {
  const parsed = Number(process.env.UZUM_SESSION_TIMEOUT_SECONDS);
  return Number.isInteger(parsed) && parsed >= 600 && parsed <= 1800
    ? parsed
    : 900;
};

const EnsureRedirectURL = (value: string | undefined, error: string) => {
  if (!value) throw InternalServerError(error);

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw InternalServerError(error);
  }
};

const BuildMerchantParams = (order: PaymentOrderModel) => {
  if (process.env.UZUM_AUTO_FISCALIZATION !== "true") return {};

  const spic = process.env.UZUM_IKPU_CODE;
  const packageCode = process.env.UZUM_PACKAGE_CODE;
  const productID = process.env.UZUM_PRODUCT_ID;
  const vatPercent = Number(process.env.UZUM_VAT_PERCENT);

  if (
    !spic ||
    !packageCode ||
    !productID ||
    !Number.isInteger(vatPercent) ||
    vatPercent < 0
  ) {
    throw InternalServerError("UZUM_FISCALIZATION_NOT_CONFIGURED");
  }

  const total = Number(order.amount) * 100;
  return {
    cart: {
      cartId: randomUUID(),
      receiptType: "PURCHASE",
      total,
      items: [
        {
          title: "Пополнение карты Central Park",
          productId: productID,
          quantity: 1,
          unitPrice: total,
          total,
          receiptParams: {
            spic,
            packageCode,
            vatPercent,
          },
        },
      ],
    },
  };
};

export const RegisterUzumPaymentService = async (
  order: PaymentOrderModel,
  clientID: string,
  cardNumber: string,
) => {
  const config = GetUzumConfig();
  const successURL = EnsureRedirectURL(
    process.env.UZUM_SUCCESS_URL,
    "UZUM_SUCCESS_URL_INVALID",
  );
  const failureURL = EnsureRedirectURL(
    process.env.UZUM_FAILURE_URL,
    "UZUM_FAILURE_URL_INVALID",
  );
  const request: UzumRegisterPaymentRequest = {
    amount: Number(order.amount) * 100,
    clientId: clientID,
    currency: 860,
    paymentDetails: `Пополнение карты Central Park №${cardNumber}. Заказ №${order.id}`,
    orderNumber: String(order.id),
    successUrl: successURL,
    failureUrl: failureURL,
    viewType: "REDIRECT",
    paymentParams: {
      operationType: "PAYMENT",
      payType: "ONE_STEP",
    },
    merchantParams: BuildMerchantParams(order),
    sessionTimeoutSecs: GetSessionTimeout(),
  };

  let response: UzumRegisterPaymentResponse;
  try {
    const result = await axios.post<UzumRegisterPaymentResponse>(
      `${config.apiURL}/api/v1/payment/register`,
      request,
      { headers: config.headers, timeout: 15_000 },
    );
    response = result.data;
  } catch {
    throw InternalServerError("UZUM_REGISTER_REQUEST_FAILED");
  }

  const uzumOrderID = response.result?.orderId;
  const checkoutURL = response.result?.paymentRedirectUrl;
  if (response.errorCode !== 0 || !uzumOrderID || !checkoutURL) {
    throw InternalServerError("UZUM_REGISTER_FAILED");
  }

  return {
    uzum_order_id: uzumOrderID,
    checkout_url: EnsureRedirectURL(checkoutURL, "UZUM_CHECKOUT_URL_INVALID"),
  };
};

export const GetUzumOrderStatusService = async (uzumOrderID: string) => {
  const config = GetUzumConfig();

  let response: UzumOrderStatusResponse;
  try {
    const result = await axios.post<UzumOrderStatusResponse>(
      `${config.apiURL}/api/v1/payment/getOrderStatus`,
      { orderId: uzumOrderID },
      { headers: config.headers, timeout: 15_000 },
    );
    response = result.data;
  } catch {
    throw InternalServerError("UZUM_STATUS_REQUEST_FAILED");
  }

  if (response.errorCode !== 0 || !response.result) {
    throw InternalServerError("UZUM_STATUS_REQUEST_FAILED");
  }

  return response.result;
};

const StringValue = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;

const StatusValue = (result: Record<string, unknown>) =>
  StringValue(
    result.status ?? result.orderStatus ?? result.operationState ?? result.state,
  )?.toUpperCase() ?? null;

const NormalizeState = (status: string | null) => {
  switch (status) {
    case "SUCCESS":
    case "COMPLETED":
      return UzumTransactionStateTypes.COMPLETED;
    case "DECLINED":
    case "FAILED":
    case "CANCELLED":
      return UzumTransactionStateTypes.DECLINED;
    case "REFUNDED":
      return UzumTransactionStateTypes.REFUNDED;
    case "REGISTERED":
    case "PROCESSING":
    case "PENDING":
      return UzumTransactionStateTypes.REGISTERED;
    default:
      throw BadRequest("UZUM_STATUS_UNKNOWN");
  }
};

const ValidateStatusResult = (
  result: Record<string, unknown>,
  transaction: UzumTransactionModel,
) => {
  const statusOrderID = StringValue(result.orderId ?? result.order_id);
  if (statusOrderID && statusOrderID !== transaction.uzum_order_id) {
    throw BadRequest("UZUM_ORDER_ID_MISMATCH");
  }

  const statusOrderNumber = StringValue(
    result.orderNumber ?? result.order_number ?? result.merchantOrderId,
  );
  if (statusOrderNumber && statusOrderNumber !== transaction.order_number) {
    throw BadRequest("UZUM_ORDER_NUMBER_MISMATCH");
  }

  const rawAmount = result.amount;
  if (rawAmount !== undefined && rawAmount !== null) {
    const amount = Number(rawAmount);
    if (!Number.isSafeInteger(amount) || amount !== Number(transaction.amount) * 100) {
      throw BadRequest("UZUM_AMOUNT_MISMATCH");
    }
  }
};

const CompleteUzumPayment = async (
  callback: UzumCallbackBody,
  transaction: Transaction,
) => {
  const uzumTransaction = await UzumTransactionModel.findOne({
    where: { uzum_order_id: callback.orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!uzumTransaction) throw NotFound("UZUM_TRANSACTION_NOT_FOUND");

  const order = await PaymentOrderModel.findByPk(
    uzumTransaction.payment_order,
    { transaction, lock: transaction.LOCK.UPDATE },
  );
  if (!order) throw NotFound("PAYMENT_ORDER_NOT_FOUND");

  if (
    uzumTransaction.state === UzumTransactionStateTypes.COMPLETED &&
    order.status === PaymentOrderStatusTypes.PAID &&
    uzumTransaction.card_transaction
  ) {
    await uzumTransaction.update(
      { raw_callback: callback },
      { transaction },
    );
    return;
  }

  if (
    order.provider !== PaymentProviderTypes.UZUM ||
    order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP ||
    order.status !== PaymentOrderStatusTypes.PROCESSING
  ) {
    throw BadRequest("UZUM_ORDER_CANNOT_BE_COMPLETED");
  }

  const card = await CardModel.findByPk(order.card, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (
    !card ||
    card.status !== CardStatusTypes.ACTIVE ||
    card.user === null ||
    String(card.user) !== String(order.user)
  ) {
    throw BadRequest("CARD_MUST_BE_ACTIVE");
  }

  const amount = Number(order.amount);
  const balanceBefore = Number(card.balance);
  const balanceAfter = balanceBefore + amount;
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(balanceBefore) ||
    !Number.isSafeInteger(balanceAfter)
  ) {
    throw InternalServerError("CARD_BALANCE_OVERFLOW");
  }

  const report = await AddOnlinePaymentToDailyZReportService(
    PaymentServiceType.UZUM,
    amount,
    transaction,
  );
  const cardTransaction = await CardTransactionModel.create(
    {
      card: Number(card.id),
      operator: null,
      cashbox: Number(report.cashbox.id),
      attraction: null,
      xreport: null,
      cashbox_report: Number(report.report.id),
      type: CardTransactionType.TOPUP,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      activation_amount: 0,
      description: "Uzum orqali karta balansini to‘ldirish",
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
      payment_service: PaymentServiceType.UZUM,
      status: CardTransactionStatusTypes.SUCCESS,
    },
    { transaction },
  );
  const now = new Date();
  await card.update({ balance: balanceAfter }, { transaction });
  await uzumTransaction.update(
    {
      card_transaction: Number(cardTransaction.id),
      merchant_operation_id: callback.merchantOperationId || null,
      state: UzumTransactionStateTypes.COMPLETED,
      operation_type: callback.operationType,
      rrn: callback.rrn || null,
      card_type: callback.cardType ?? null,
      binding_id: callback.bindingId || null,
      raw_callback: callback,
      completed_at: now,
    },
    { transaction },
  );
  await order.update(
    { status: PaymentOrderStatusTypes.PAID, performed_at: now },
    { transaction },
  );
};

const DeclineUzumPayment = async (
  callback: UzumCallbackBody,
  transaction: Transaction,
) => {
  const uzumTransaction = await UzumTransactionModel.findOne({
    where: { uzum_order_id: callback.orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!uzumTransaction) throw NotFound("UZUM_TRANSACTION_NOT_FOUND");
  if (uzumTransaction.state === UzumTransactionStateTypes.COMPLETED) {
    throw BadRequest("UZUM_COMPLETED_TRANSACTION_CANNOT_BE_DECLINED");
  }
  const order = await PaymentOrderModel.findByPk(
    uzumTransaction.payment_order,
    { transaction, lock: transaction.LOCK.UPDATE },
  );
  if (!order) throw NotFound("PAYMENT_ORDER_NOT_FOUND");

  const now = new Date();
  await uzumTransaction.update(
    {
      merchant_operation_id: callback.merchantOperationId || null,
      state: UzumTransactionStateTypes.DECLINED,
      operation_type: callback.operationType,
      rrn: callback.rrn || null,
      raw_callback: callback,
      declined_at: now,
    },
    { transaction },
  );
  await order.update(
    { status: PaymentOrderStatusTypes.CANCELLED, cancelled_at: now },
    { transaction },
  );
};

const ApplyUzumRefund = async (
  callback: UzumCallbackBody,
  transaction: Transaction,
) => {
  const uzumTransaction = await UzumTransactionModel.findOne({
    where: { uzum_order_id: callback.orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!uzumTransaction) throw NotFound("UZUM_TRANSACTION_NOT_FOUND");
  if (uzumTransaction.state === UzumTransactionStateTypes.REFUNDED) {
    await uzumTransaction.update({ raw_callback: callback }, { transaction });
    return;
  }
  if (
    uzumTransaction.state !== UzumTransactionStateTypes.COMPLETED ||
    !uzumTransaction.card_transaction
  ) {
    throw BadRequest("UZUM_TRANSACTION_NOT_COMPLETED");
  }

  const order = await PaymentOrderModel.findByPk(
    uzumTransaction.payment_order,
    { transaction, lock: transaction.LOCK.UPDATE },
  );
  if (!order) throw NotFound("PAYMENT_ORDER_NOT_FOUND");
  const card = await CardModel.findByPk(order.card, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!card) throw NotFound("CARD_NOT_FOUND");

  const amount = Number(order.amount);
  const balanceBefore = Number(card.balance);
  const balanceAfter = balanceBefore - amount;
  if (!Number.isSafeInteger(balanceAfter) || balanceAfter < 0) {
    throw BadRequest("INSUFFICIENT_CARD_BALANCE_FOR_UZUM_REFUND");
  }

  const report = await AddOnlineRefundToDailyZReportService(
    PaymentServiceType.UZUM,
    amount,
    transaction,
  );
  await CardTransactionModel.create(
    {
      card: Number(card.id),
      operator: null,
      cashbox: Number(report.cashbox.id),
      attraction: null,
      xreport: null,
      cashbox_report: Number(report.report.id),
      type: CardTransactionType.REFUND,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      activation_amount: 0,
      description: "Uzum to‘lovini qaytarish",
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
      payment_service: PaymentServiceType.UZUM,
      status: CardTransactionStatusTypes.SUCCESS,
    },
    { transaction },
  );
  const now = new Date();
  await card.update({ balance: balanceAfter }, { transaction });
  await uzumTransaction.update(
    {
      merchant_operation_id: callback.merchantOperationId || null,
      state: UzumTransactionStateTypes.REFUNDED,
      operation_type: callback.operationType,
      rrn: callback.rrn || null,
      raw_callback: callback,
      refunded_at: now,
    },
    { transaction },
  );
};

export const ProcessUzumCallbackService = async (
  callback: UzumCallbackBody,
): Promise<UzumCallbackResponse> => {
  if (
    !callback ||
    typeof callback.orderId !== "string" ||
    !callback.orderId ||
    typeof callback.orderNumber !== "string" ||
    !callback.orderNumber ||
    typeof callback.operationState !== "string" ||
    typeof callback.operationType !== "string"
  ) {
    throw BadRequest("UZUM_CALLBACK_INVALID");
  }

  const localTransaction = await UzumTransactionModel.findOne({
    where: { uzum_order_id: callback.orderId },
  });
  if (!localTransaction) throw NotFound("UZUM_TRANSACTION_NOT_FOUND");
  if (localTransaction.order_number !== callback.orderNumber) {
    throw BadRequest("UZUM_ORDER_NUMBER_MISMATCH");
  }

  const statusResult = await GetUzumOrderStatusService(callback.orderId);
  ValidateStatusResult(statusResult, localTransaction);
  const state = NormalizeState(StatusValue(statusResult));

  await sequelize.transaction(async (transaction) => {
    if (state === UzumTransactionStateTypes.COMPLETED) {
      await CompleteUzumPayment(callback, transaction);
    } else if (state === UzumTransactionStateTypes.DECLINED) {
      await DeclineUzumPayment(callback, transaction);
    } else if (state === UzumTransactionStateTypes.REFUNDED) {
      await ApplyUzumRefund(callback, transaction);
    } else {
      const current = await UzumTransactionModel.findOne({
        where: { uzum_order_id: callback.orderId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!current) throw NotFound("UZUM_TRANSACTION_NOT_FOUND");
      await current.update(
        {
          merchant_operation_id: callback.merchantOperationId || null,
          operation_type: callback.operationType,
          raw_callback: callback,
        },
        { transaction },
      );
    }
  });

  return { ok: true };
};
