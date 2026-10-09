import { createHash, timingSafeEqual } from "crypto";
import { Transaction, UniqueConstraintError } from "sequelize";
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
import { PaymentOrderModel } from "../../../models/postgresql/payment-orders-model/PaymentOrderModel";
import { UzumTransactionModel } from "../../../models/postgresql/uzum-transactions-model/UzumTransactionModel";
import { UzumTransactionStateTypes } from "../../../models/postgresql/uzum-transactions-model/enums";
import {
  CardModel,
  CardTransactionModel,
  sequelize,
  UzumTransactionModel as UzumTransaction,
} from "../../../plugins/db/postgresql/db";
import { AddOnlinePaymentToDailyZReportService } from "../OnlinePaymentReportServices";

export const UZUM_MERCHANT_ERROR_CODES = {
  ACCESS_DENIED: "10001",
  INVALID_JSON: "10002",
  INVALID_OPERATION: "10003",
  REQUIRED_PARAMETER_MISSING: "10005",
  INVALID_SERVICE_ID: "10006",
  PAYMENT_ATTRIBUTE_NOT_FOUND: "10007",
  PAYMENT_ALREADY_PAID: "10008",
  PAYMENT_CANCELLED: "10009",
  TRANSACTION_ALREADY_CREATED: "10010",
  INVALID_AMOUNT: "10011",
  AMOUNT_BELOW_MINIMUM: "10012",
  AMOUNT_ABOVE_MAXIMUM: "10013",
  TRANSACTION_NOT_FOUND: "10014",
  TRANSACTION_CANCELLED: "10015",
  TRANSACTION_ALREADY_CONFIRMED: "10016",
  TRANSACTION_CANNOT_BE_REVERSED: "10017",
  TRANSACTION_ALREADY_REVERSED: "10018",
  INTERNAL_ERROR: "99999",
} as const;

export type UzumMerchantErrorCode =
  (typeof UZUM_MERCHANT_ERROR_CODES)[keyof typeof UZUM_MERCHANT_ERROR_CODES];

export class UzumMerchantError extends Error {
  public readonly errorCode: UzumMerchantErrorCode;

  constructor(errorCode: UzumMerchantErrorCode, message?: string) {
    super(message || errorCode);
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, UzumMerchantError.prototype);
  }
}

function fail(
  errorCode: UzumMerchantErrorCode,
  message?: string,
): never {
  throw new UzumMerchantError(errorCode, message);
}

const getMerchantServiceID = () => {
  const serviceID = Number(process.env.UZUM_MERCHANT_SERVICE_ID);

  if (!Number.isSafeInteger(serviceID) || serviceID <= 0) {
    fail(UZUM_MERCHANT_ERROR_CODES.INTERNAL_ERROR, "SERVICE_ID_NOT_CONFIGURED");
  }

  return serviceID;
};

const assertServiceID = (serviceID: number) => {
  if (serviceID !== getMerchantServiceID()) {
    fail(UZUM_MERCHANT_ERROR_CODES.INVALID_SERVICE_ID);
  }
};

const secureStringEqual = (left: string, right: string) => {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
};

export const AssertUzumMerchantAuthorization = (
  authorization: string | undefined,
) => {
  const username = process.env.UZUM_MERCHANT_USERNAME;
  const password = process.env.UZUM_MERCHANT_PASSWORD;

  if (!username || !password) {
    fail(UZUM_MERCHANT_ERROR_CODES.INTERNAL_ERROR, "AUTH_NOT_CONFIGURED");
  }

  if (!authorization?.startsWith("Basic ")) {
    fail(UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED);
  }

  let decoded = "";
  try {
    decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  } catch {
    fail(UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED);
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) {
    fail(UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED);
  }

  const actualUsername = decoded.slice(0, separator);
  const actualPassword = decoded.slice(separator + 1);
  if (
    !secureStringEqual(actualUsername, username) ||
    !secureStringEqual(actualPassword, password)
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED);
  }
};

const getOrderID = (params: UzumMerchantParams) => {
  const rawOrderID = params?.order_id;
  const orderID = Number(rawOrderID);

  if (
    (typeof rawOrderID !== "string" && typeof rawOrderID !== "number") ||
    !Number.isSafeInteger(orderID) ||
    orderID <= 0
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_ATTRIBUTE_NOT_FOUND);
  }

  return orderID;
};

const getOrder = async (
  orderID: number,
  transaction?: Transaction,
) => {
  const order = await PaymentOrderModel.findByPk(orderID, {
    ...(transaction
      ? { transaction, lock: transaction.LOCK.UPDATE }
      : {}),
  });

  if (
    !order ||
    order.provider !== PaymentProviderTypes.UZUM ||
    order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_ATTRIBUTE_NOT_FOUND);
  }

  if (order.status === PaymentOrderStatusTypes.PAID) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_ALREADY_PAID);
  }

  if (
    [
      PaymentOrderStatusTypes.CANCELLED,
      PaymentOrderStatusTypes.EXPIRED,
    ].includes(order.status)
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_CANCELLED);
  }

  if (
    process.env.UZUM_EXPIRATION_DISABLED !== "true" &&
    order.expires_at &&
    order.expires_at.getTime() <= Date.now()
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_CANCELLED);
  }

  return order;
};

const getActiveOrderCard = async (
  order: PaymentOrderModel,
  transaction?: Transaction,
) => {
  const card = await CardModel.findByPk(order.card, {
    ...(transaction
      ? { transaction, lock: transaction.LOCK.UPDATE }
      : {}),
  });

  if (
    !card ||
    card.status !== CardStatusTypes.ACTIVE ||
    card.user === null ||
    Number(card.user) !== Number(order.user)
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.PAYMENT_ATTRIBUTE_NOT_FOUND);
  }

  return card;
};

const orderData = (
  order: PaymentOrderModel,
  card?: CardModel,
): UzumMerchantData => {
  const data: UzumMerchantData = {
    amount: { value: String(order.amount) },
  };

  if (card?.card) {
    data.card = { value: `****${String(card.card).slice(-4)}` };
  }

  return data;
};

const amountInTiyin = (order: PaymentOrderModel) => {
  const amount = Number(order.amount) * 100;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    fail(UZUM_MERCHANT_ERROR_CODES.INVALID_AMOUNT);
  }
  return amount;
};

const getConfirmTimeoutMs = () => {
  const minutes = Number(process.env.UZUM_CONFIRM_TIMEOUT_MINUTES);
  const validMinutes =
    Number.isSafeInteger(minutes) && minutes > 0 ? minutes : 30;
  return validMinutes * 60 * 1000;
};

const isConfirmationExpired = (transaction: UzumTransactionModel) =>
  process.env.UZUM_EXPIRATION_DISABLED !== "true" &&
  transaction.registered_at.getTime() + getConfirmTimeoutMs() <= Date.now();

export const CheckUzumMerchantPaymentService = async (
  body: UzumCheckRequest,
): Promise<UzumCheckResponse> => {
  assertServiceID(body.serviceId);
  const order = await getOrder(getOrderID(body.params));
  const card = await getActiveOrderCard(order);

  return {
    serviceId: body.serviceId,
    timestamp: Date.now(),
    status: "OK",
    data: orderData(order, card),
  };
};

export const CreateUzumMerchantTransactionService = async (
  body: UzumCreateRequest,
): Promise<UzumCreateResponse> => {
  assertServiceID(body.serviceId);

  try {
    return await sequelize.transaction(async (transaction) => {
      const duplicateTransaction = await UzumTransaction.findOne({
        where: { uzum_order_id: body.transId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (duplicateTransaction) {
        fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_ALREADY_CREATED);
      }

      const order = await getOrder(getOrderID(body.params), transaction);
      await getActiveOrderCard(order, transaction);

      if (body.amount !== amountInTiyin(order)) {
        fail(UZUM_MERCHANT_ERROR_CODES.INVALID_AMOUNT);
      }

      const orderTransaction = await UzumTransaction.findOne({
        where: { payment_order: order.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (orderTransaction) {
        fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_ALREADY_CREATED);
      }

      const now = new Date();
      await UzumTransaction.create(
        {
          payment_order: Number(order.id),
          card_transaction: null,
          uzum_order_id: body.transId,
          merchant_operation_id: null,
          order_number: String(order.id),
          amount: Number(order.amount),
          redirect_url: null,
          service_id: body.serviceId,
          state: UzumTransactionStateTypes.REGISTERED,
          operation_type: null,
          rrn: null,
          card_type: null,
          binding_id: null,
          payment_source: null,
          tariff: null,
          processing_reference_number: null,
          phone: null,
          raw_callback: { ...body },
          raw_create: { ...body },
          raw_confirm: null,
          raw_reverse: null,
          registered_at: now,
          completed_at: null,
          declined_at: null,
          refunded_at: null,
        },
        { transaction },
      );

      await order.update(
        { status: PaymentOrderStatusTypes.PROCESSING },
        { transaction },
      );

      return {
        serviceId: body.serviceId,
        transId: body.transId,
        status: "CREATED" as const,
        transTime: now.getTime(),
        amount: body.amount,
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_ALREADY_CREATED);
    }
    throw error;
  }
};

const createSuccessfulTopUp = async (
  order: PaymentOrderModel,
  card: CardModel,
  transaction: Transaction,
) => {
  const amount = Number(order.amount);
  const balanceBefore = Number(card.balance);
  const balanceAfter = balanceBefore + amount;

  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(balanceBefore) ||
    !Number.isSafeInteger(balanceAfter)
  ) {
    fail(UZUM_MERCHANT_ERROR_CODES.INTERNAL_ERROR, "CARD_BALANCE_OVERFLOW");
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

  await card.update({ balance: balanceAfter }, { transaction });
  return cardTransaction;
};

export const ConfirmUzumMerchantTransactionService = async (
  body: UzumConfirmRequest,
): Promise<UzumConfirmResponse> => {
  assertServiceID(body.serviceId);

  const result = await sequelize.transaction(async (transaction) => {
    const uzumTransaction = await UzumTransaction.findOne({
      where: { uzum_order_id: body.transId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!uzumTransaction) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }
    if (uzumTransaction.state === UzumTransactionStateTypes.COMPLETED) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_ALREADY_CONFIRMED);
    }
    if (
      [
        UzumTransactionStateTypes.REFUNDED,
        UzumTransactionStateTypes.DECLINED,
      ].includes(uzumTransaction.state)
    ) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANCELLED);
    }

    const order = await PaymentOrderModel.findByPk(
      uzumTransaction.payment_order,
      { transaction, lock: transaction.LOCK.UPDATE },
    );
    if (!order) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    if (isConfirmationExpired(uzumTransaction)) {
      const now = new Date();
      await uzumTransaction.update(
        {
          state: UzumTransactionStateTypes.DECLINED,
          raw_confirm: { ...body },
          raw_callback: { ...body },
          declined_at: now,
        },
        { transaction },
      );
      await order.update(
        {
          status: PaymentOrderStatusTypes.EXPIRED,
          cancelled_at: now,
        },
        { transaction },
      );
      return { failed: true as const };
    }

    if (
      order.provider !== PaymentProviderTypes.UZUM ||
      order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP ||
      order.status !== PaymentOrderStatusTypes.PROCESSING
    ) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANCELLED);
    }

    const card = await getActiveOrderCard(order, transaction);
    const cardTransaction = await createSuccessfulTopUp(
      order,
      card,
      transaction,
    );
    const now = new Date();

    await uzumTransaction.update(
      {
        card_transaction: Number(cardTransaction.id),
        state: UzumTransactionStateTypes.COMPLETED,
        payment_source: body.paymentSource,
        tariff: body.tariff ?? null,
        processing_reference_number:
          body.processingReferenceNumber ?? null,
        phone: body.phone,
        card_type: body.cardType ?? null,
        raw_confirm: { ...body },
        raw_callback: { ...body },
        completed_at: now,
      },
      { transaction },
    );
    await order.update(
      {
        status: PaymentOrderStatusTypes.PAID,
        performed_at: now,
      },
      { transaction },
    );

    return {
      failed: false as const,
      response: {
        serviceId: body.serviceId,
        transId: body.transId,
        status: "CONFIRMED" as const,
        confirmTime: now.getTime(),
        amount: amountInTiyin(order),
      },
    };
  });

  if (result.failed) {
    fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANCELLED);
  }
  return result.response;
};

const reverseConfirmedTopUp = async (
  uzumTransaction: UzumTransactionModel,
  order: PaymentOrderModel,
  transaction: Transaction,
) => {
  const cardTransactionID = uzumTransaction.card_transaction;
  if (!cardTransactionID) {
    fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANNOT_BE_REVERSED);
  }

  const originalCardTransaction = await CardTransactionModel.findByPk(
    cardTransactionID,
    { transaction, lock: transaction.LOCK.UPDATE },
  );
  const card = await CardModel.findByPk(order.card, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!originalCardTransaction || !card) {
    fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANNOT_BE_REVERSED);
  }

  const amount = Number(order.amount);
  const balanceBefore = Number(card.balance);
  const balanceAfter = balanceBefore - amount;
  if (!Number.isSafeInteger(balanceAfter) || balanceAfter < 0) {
    fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANNOT_BE_REVERSED);
  }

  await CardTransactionModel.create(
    {
      card: Number(card.id),
      operator: null,
      cashbox: originalCardTransaction.cashbox,
      attraction: null,
      xreport: null,
      cashbox_report: originalCardTransaction.cashbox_report,
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
  await card.update({ balance: balanceAfter }, { transaction });

  return card;
};

export const ReverseUzumMerchantTransactionService = async (
  body: UzumReverseRequest,
): Promise<UzumReverseResponse> => {
  assertServiceID(body.serviceId);

  return sequelize.transaction(async (transaction) => {
    const uzumTransaction = await UzumTransaction.findOne({
      where: { uzum_order_id: body.transId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!uzumTransaction) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }
    if (uzumTransaction.state === UzumTransactionStateTypes.REFUNDED) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_ALREADY_REVERSED);
    }
    if (uzumTransaction.state === UzumTransactionStateTypes.DECLINED) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANNOT_BE_REVERSED);
    }

    const order = await PaymentOrderModel.findByPk(
      uzumTransaction.payment_order,
      { transaction, lock: transaction.LOCK.UPDATE },
    );
    if (!order) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    const card = await CardModel.findByPk(order.card, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!card) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANNOT_BE_REVERSED);
    }

    if (uzumTransaction.state === UzumTransactionStateTypes.COMPLETED) {
      await reverseConfirmedTopUp(
        uzumTransaction,
        order,
        transaction,
      );
    }

    const now = new Date();
    await uzumTransaction.update(
      {
        state: UzumTransactionStateTypes.REFUNDED,
        raw_reverse: { ...body },
        raw_callback: { ...body },
        refunded_at: now,
      },
      { transaction },
    );
    await order.update(
      {
        status: PaymentOrderStatusTypes.CANCELLED,
        cancelled_at: now,
      },
      { transaction },
    );

    return {
      serviceId: body.serviceId,
      transId: body.transId,
      status: "REVERSED",
      reverseTime: now.getTime(),
      amount: amountInTiyin(order),
    };
  });
};

const protocolStatus = (state: UzumTransactionStateTypes) => {
  switch (state) {
    case UzumTransactionStateTypes.REGISTERED:
      return "CREATED" as const;
    case UzumTransactionStateTypes.COMPLETED:
      return "CONFIRMED" as const;
    case UzumTransactionStateTypes.REFUNDED:
      return "REVERSED" as const;
    case UzumTransactionStateTypes.DECLINED:
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANCELLED);
  }
};

export const GetUzumMerchantTransactionStatusService = async (
  body: UzumStatusRequest,
): Promise<UzumStatusResponse> => {
  assertServiceID(body.serviceId);

  const result = await sequelize.transaction(async (transaction) => {
    const uzumTransaction = await UzumTransaction.findOne({
      where: { uzum_order_id: body.transId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!uzumTransaction) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }
    const order = await PaymentOrderModel.findByPk(
      uzumTransaction.payment_order,
      { transaction, lock: transaction.LOCK.UPDATE },
    );
    if (!order) {
      fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    if (
      uzumTransaction.state === UzumTransactionStateTypes.REGISTERED &&
      isConfirmationExpired(uzumTransaction)
    ) {
      const now = new Date();
      await uzumTransaction.update(
        {
          state: UzumTransactionStateTypes.DECLINED,
          declined_at: now,
        },
        { transaction },
      );
      await order.update(
        {
          status: PaymentOrderStatusTypes.EXPIRED,
          cancelled_at: now,
        },
        { transaction },
      );
      return { failed: true as const };
    }

    if (uzumTransaction.state === UzumTransactionStateTypes.DECLINED) {
      return { failed: true as const };
    }

    const card = await CardModel.findByPk(order.card, { transaction });
    return {
      failed: false as const,
      response: {
        serviceId: body.serviceId,
        transId: body.transId,
        status: protocolStatus(uzumTransaction.state),
        transTime: uzumTransaction.registered_at.getTime(),
        confirmTime: uzumTransaction.completed_at?.getTime() ?? null,
        reverseTime: uzumTransaction.refunded_at?.getTime() ?? null,
        data: orderData(order, card ?? undefined),
        amount: amountInTiyin(order),
      },
    };
  });

  if (result.failed) {
    fail(UZUM_MERCHANT_ERROR_CODES.TRANSACTION_CANCELLED);
  }
  return result.response;
};
