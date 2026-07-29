import {
  PaymeErrorResponse,
  PaymeErrors,
} from "../../../exceptions/payme/PaymeExceptions";
import { Op } from "sequelize";
import { CardModel } from "../../../models/postgresql/cards-model/CardModel";
import { CardStatusTypes } from "../../../models/postgresql/cards-model/enums";
import { CardTransactionModel } from "../../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentServiceType,
  PaymentType,
} from "../../../models/postgresql/card-transactions-model/enums";
import { PaymentOrderModel } from "../../../models/postgresql/payment-orders-model/PaymentOrderModel";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "../../../models/postgresql/payment-orders-model/enums";
import { PaymeTransactionModel } from "../../../models/postgresql/payme-transactions-model/PaymeTransactionModel";
import { PaymeTransactionStateTypes } from "../../../models/postgresql/payme-transactions-model/enums";
import { sequelize } from "../../../plugins/db/postgresql/db";
import {
  AddOnlinePaymentToDailyZReportService,
  AddOnlineRefundToDailyZReportService,
} from "../OnlinePaymentReportServices";

const PAYME_CREATE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export const PAYME_METHODS: ReadonlySet<PaymeMethodName> = new Set([
  "CheckPerformTransaction",
  "CreateTransaction",
  "PerformTransaction",
  "CancelTransaction",
  "CheckTransaction",
  "GetStatement",
]);

export const IsPaymeRpcRequest = (
  data: unknown,
): data is PaymeRpcRequest => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const request = data as Partial<PaymeRpcRequest>;

  return (
    Number.isInteger(request.id) &&
    typeof request.method === "string" &&
    request.method.length > 0 &&
    Boolean(request.params) &&
    typeof request.params === "object" &&
    !Array.isArray(request.params)
  );
};

const isCheckPerformTransactionParams = (
  params: Record<string, unknown>,
): params is PaymeCheckPerformTransactionParams => {
  if (
    !params.account ||
    typeof params.account !== "object" ||
    Array.isArray(params.account)
  ) {
    return false;
  }

  const orderID = (params.account as { order_id?: unknown }).order_id;

  return (
    ((typeof orderID === "string" && /^[1-9]\d*$/.test(orderID)) ||
      (Number.isSafeInteger(orderID) && Number(orderID) > 0)) &&
    Number.isSafeInteger(params.amount) &&
    Number(params.amount) > 0
  );
};

const CheckPerformTransactionService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isCheckPerformTransactionParams(request.params)) {
    if (
      !Number.isSafeInteger(request.params.amount) ||
      Number(request.params.amount) <= 0
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.invalidAmount());
    }

    return PaymeErrorResponse(request.id, PaymeErrors.orderNotFound());
  }

  const { amount, account } = request.params;
  const order = await PaymentOrderModel.findByPk(account.order_id);

  if (!order) {
    return PaymeErrorResponse(request.id, PaymeErrors.orderNotFound());
  }

  let expectedAmount: bigint;

  try {
    expectedAmount = BigInt(order.amount) * BigInt(100);
  } catch {
    return PaymeErrorResponse(request.id, PaymeErrors.system());
  }

  if (BigInt(amount) !== expectedAmount) {
    return PaymeErrorResponse(request.id, PaymeErrors.invalidAmount());
  }

  if (
    order.provider !== PaymentProviderTypes.PAYME ||
    order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP ||
    order.status !== PaymentOrderStatusTypes.PENDING
  ) {
    return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
  }

  if (order.expires_at && order.expires_at.getTime() <= Date.now()) {
    await order.update({
      status: PaymentOrderStatusTypes.EXPIRED,
    });

    return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
  }

  const card = await CardModel.findByPk(order.card);

  if (
    !card ||
    card.status !== CardStatusTypes.ACTIVE ||
    card.user === null ||
    String(card.user) !== String(order.user)
  ) {
    return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
  }

  return {
    id: request.id,
    result: {
      allow: true,
    },
  };
};

const isCreateTransactionParams = (
  params: Record<string, unknown>,
): params is PaymeCreateTransactionParams =>
  isCheckPerformTransactionParams(params) &&
  typeof params.id === "string" &&
  params.id.length > 0 &&
  params.id.length <= 64 &&
  Number.isSafeInteger(params.time) &&
  Number(params.time) > 0;

const paymeTransactionResult = (
  requestID: number,
  transaction: PaymeTransactionModel,
): PaymeRpcResponse => ({
  id: requestID,
  result: {
    create_time: Number(transaction.create_time),
    transaction: String(transaction.id),
    state: transaction.state,
  },
});

const CreateTransactionService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isCreateTransactionParams(request.params)) {
    if (
      !Number.isSafeInteger(request.params.amount) ||
      Number(request.params.amount) <= 0
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.invalidAmount());
    }

    return PaymeErrorResponse(request.id, PaymeErrors.invalidRequest());
  }

  const { id: paymeID, time, amount, account } = request.params;

  return sequelize.transaction(async (dbTransaction) => {
    const order = await PaymentOrderModel.findByPk(account.order_id, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!order) {
      return PaymeErrorResponse(request.id, PaymeErrors.orderNotFound());
    }

    const existingByPaymeID = await PaymeTransactionModel.findOne({
      where: {
        payme_id: paymeID,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (existingByPaymeID) {
      if (
        String(existingByPaymeID.payment_order) !== String(order.id) ||
        Number(existingByPaymeID.amount) !== amount
      ) {
        return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
      }

      if (
        existingByPaymeID.state === PaymeTransactionStateTypes.CREATED &&
        Date.now() - Number(existingByPaymeID.create_time) >=
          PAYME_CREATE_TIMEOUT_MS
      ) {
        const cancelTime = Date.now();

        await existingByPaymeID.update(
          {
            state: PaymeTransactionStateTypes.CANCELLED_BEFORE_PERFORM,
            reason: 4,
            cancel_time: cancelTime,
          },
          {
            transaction: dbTransaction,
          },
        );

        await order.update(
          {
            status: PaymentOrderStatusTypes.CANCELLED,
            cancelled_at: new Date(cancelTime),
          },
          {
            transaction: dbTransaction,
          },
        );
      }

      return paymeTransactionResult(request.id, existingByPaymeID);
    }

    let expectedAmount: bigint;

    try {
      expectedAmount = BigInt(order.amount) * BigInt(100);
    } catch {
      return PaymeErrorResponse(request.id, PaymeErrors.system());
    }

    if (BigInt(amount) !== expectedAmount) {
      return PaymeErrorResponse(request.id, PaymeErrors.invalidAmount());
    }

    if (
      order.provider !== PaymentProviderTypes.PAYME ||
      order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP ||
      order.status !== PaymentOrderStatusTypes.PENDING
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    if (order.expires_at && order.expires_at.getTime() <= Date.now()) {
      await order.update(
        {
          status: PaymentOrderStatusTypes.EXPIRED,
        },
        {
          transaction: dbTransaction,
        },
      );

      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
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
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    const existingByOrder = await PaymeTransactionModel.findOne({
      where: {
        payment_order: order.id,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (existingByOrder) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    const createTime = Date.now();
    const paymeTransaction = await PaymeTransactionModel.create(
      {
        payment_order: order.id,
        card_transaction: null,
        payme_id: paymeID,
        payme_time: time,
        amount,
        account,
        receivers: null,
        state: PaymeTransactionStateTypes.CREATED,
        reason: null,
        create_time: createTime,
        perform_time: 0,
        cancel_time: 0,
      },
      {
        transaction: dbTransaction,
      },
    );

    await order.update(
      {
        status: PaymentOrderStatusTypes.PROCESSING,
      },
      {
        transaction: dbTransaction,
      },
    );

    return paymeTransactionResult(request.id, paymeTransaction);
  });
};

const isPerformTransactionParams = (
  params: Record<string, unknown>,
): params is PaymePerformTransactionParams =>
  typeof params.id === "string" &&
  params.id.length > 0 &&
  params.id.length <= 64;

const performTransactionResult = (
  requestID: number,
  transaction: PaymeTransactionModel,
): PaymeRpcResponse => ({
  id: requestID,
  result: {
    perform_time: Number(transaction.perform_time),
    transaction: String(transaction.id),
    state: transaction.state,
  },
});

const PerformTransactionService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isPerformTransactionParams(request.params)) {
    return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
  }

  const paymeID = request.params.id;

  return sequelize.transaction(async (dbTransaction) => {
    /*
     * Locklar CreateTransaction bilan bir xil tartibda olinadi:
     * payment order -> Payme transaction -> card.
     */
    const transactionSnapshot = await PaymeTransactionModel.findOne({
      where: {
        payme_id: paymeID,
      },
      transaction: dbTransaction,
    });

    if (!transactionSnapshot) {
      return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
    }

    const order = await PaymentOrderModel.findByPk(
      transactionSnapshot.payment_order,
      {
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      },
    );

    if (!order) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    const paymeTransaction = await PaymeTransactionModel.findOne({
      where: {
        payme_id: paymeID,
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!paymeTransaction) {
      return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
    }

    if (paymeTransaction.state === PaymeTransactionStateTypes.PERFORMED) {
      return performTransactionResult(request.id, paymeTransaction);
    }

    if (paymeTransaction.state !== PaymeTransactionStateTypes.CREATED) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    if (
      Date.now() - Number(paymeTransaction.create_time) >=
      PAYME_CREATE_TIMEOUT_MS
    ) {
      const cancelTime = Date.now();

      await paymeTransaction.update(
        {
          state: PaymeTransactionStateTypes.CANCELLED_BEFORE_PERFORM,
          reason: 4,
          cancel_time: cancelTime,
        },
        {
          transaction: dbTransaction,
        },
      );

      await order.update(
        {
          status: PaymentOrderStatusTypes.CANCELLED,
          cancelled_at: new Date(cancelTime),
        },
        {
          transaction: dbTransaction,
        },
      );

      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    if (
      order.status !== PaymentOrderStatusTypes.PROCESSING ||
      order.provider !== PaymentProviderTypes.PAYME ||
      order.purpose !== PaymentOrderPurposeTypes.CARD_TOPUP
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
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
      return PaymeErrorResponse(request.id, PaymeErrors.cannotPerform());
    }

    const balanceBefore = Number(card.balance);
    const topUpAmount = Number(order.amount);
    const balanceAfter = balanceBefore + topUpAmount;

    if (
      !Number.isSafeInteger(balanceBefore) ||
      !Number.isSafeInteger(topUpAmount) ||
      !Number.isSafeInteger(balanceAfter)
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.system());
    }

    const onlineReport = await AddOnlinePaymentToDailyZReportService(
      PaymentServiceType.PAYME,
      topUpAmount,
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
        amount: topUpAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        activation_amount: 0,
        description: "Payme orqali karta balansini to‘ldirish",
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
        payment_service: PaymentServiceType.PAYME,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      {
        transaction: dbTransaction,
      },
    );

    const performTime = Date.now();

    await card.update(
      {
        balance: balanceAfter,
      },
      {
        transaction: dbTransaction,
      },
    );

    await paymeTransaction.update(
      {
        state: PaymeTransactionStateTypes.PERFORMED,
        perform_time: performTime,
        card_transaction: cardTransaction.id,
      },
      {
        transaction: dbTransaction,
      },
    );

    await order.update(
      {
        status: PaymentOrderStatusTypes.PAID,
        performed_at: new Date(performTime),
      },
      {
        transaction: dbTransaction,
      },
    );

    return performTransactionResult(request.id, paymeTransaction);
  });
};

const isCancelTransactionParams = (
  params: Record<string, unknown>,
): params is PaymeCancelTransactionParams =>
  isPerformTransactionParams(params) &&
  Number.isSafeInteger(params.reason) &&
  Number(params.reason) > 0;

const cancelTransactionResult = (
  requestID: number,
  transaction: PaymeTransactionModel,
): PaymeRpcResponse => ({
  id: requestID,
  result: {
    cancel_time: Number(transaction.cancel_time),
    transaction: String(transaction.id),
    state: transaction.state,
  },
});

const CancelTransactionService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isCancelTransactionParams(request.params)) {
    return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
  }

  const { id: paymeID, reason } = request.params;

  return sequelize.transaction(async (dbTransaction) => {
    const transactionSnapshot = await PaymeTransactionModel.findOne({
      where: { payme_id: paymeID },
      transaction: dbTransaction,
    });

    if (!transactionSnapshot) {
      return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
    }

    const order = await PaymentOrderModel.findByPk(
      transactionSnapshot.payment_order,
      {
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      },
    );

    if (!order) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotCancel());
    }

    const paymeTransaction = await PaymeTransactionModel.findOne({
      where: { payme_id: paymeID },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!paymeTransaction) {
      return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
    }

    if (
      paymeTransaction.state ===
        PaymeTransactionStateTypes.CANCELLED_BEFORE_PERFORM ||
      paymeTransaction.state ===
        PaymeTransactionStateTypes.CANCELLED_AFTER_PERFORM
    ) {
      return cancelTransactionResult(request.id, paymeTransaction);
    }

    const cancelTime = Date.now();

    if (paymeTransaction.state === PaymeTransactionStateTypes.CREATED) {
      await paymeTransaction.update(
        {
          state: PaymeTransactionStateTypes.CANCELLED_BEFORE_PERFORM,
          reason,
          cancel_time: cancelTime,
        },
        { transaction: dbTransaction },
      );

      await order.update(
        {
          status: PaymentOrderStatusTypes.CANCELLED,
          cancelled_at: new Date(cancelTime),
        },
        { transaction: dbTransaction },
      );

      return cancelTransactionResult(request.id, paymeTransaction);
    }

    if (paymeTransaction.state !== PaymeTransactionStateTypes.PERFORMED) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotCancel());
    }

    const card = await CardModel.findByPk(order.card, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!card || paymeTransaction.card_transaction === null) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotCancel());
    }

    const originalCardTransaction = await CardTransactionModel.findByPk(
      paymeTransaction.card_transaction,
      {
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      },
    );

    if (
      !originalCardTransaction ||
      originalCardTransaction.type !== CardTransactionType.TOPUP ||
      originalCardTransaction.status !== CardTransactionStatusTypes.SUCCESS
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotCancel());
    }

    const refundAmount = Number(order.amount);
    const balanceBefore = Number(card.balance);
    const balanceAfter = balanceBefore - refundAmount;

    if (
      !Number.isSafeInteger(refundAmount) ||
      refundAmount <= 0 ||
      !Number.isSafeInteger(balanceBefore) ||
      balanceAfter < 0 ||
      !Number.isSafeInteger(balanceAfter)
    ) {
      return PaymeErrorResponse(request.id, PaymeErrors.cannotCancel());
    }

    const onlineRefundReport = await AddOnlineRefundToDailyZReportService(
      PaymentServiceType.PAYME,
      refundAmount,
      dbTransaction,
    );

    await CardTransactionModel.create(
      {
        card: Number(card.id),
        operator: null,
        cashbox: Number(onlineRefundReport.cashbox.id),
        attraction: null,
        xreport: null,
        cashbox_report: Number(onlineRefundReport.report.id),
        type: CardTransactionType.REFUND,
        amount: refundAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        activation_amount: 0,
        description: `Payme tranzaksiya bekor qilindi: ${paymeID}`,
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
        payment_service: PaymentServiceType.PAYME,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      { transaction: dbTransaction },
    );

    await originalCardTransaction.update(
      { status: CardTransactionStatusTypes.CANCELLED },
      { transaction: dbTransaction },
    );
    await card.update(
      { balance: balanceAfter },
      { transaction: dbTransaction },
    );
    await paymeTransaction.update(
      {
        state: PaymeTransactionStateTypes.CANCELLED_AFTER_PERFORM,
        reason,
        cancel_time: cancelTime,
      },
      { transaction: dbTransaction },
    );
    await order.update(
      {
        status: PaymentOrderStatusTypes.CANCELLED,
        cancelled_at: new Date(cancelTime),
      },
      { transaction: dbTransaction },
    );

    return cancelTransactionResult(request.id, paymeTransaction);
  });
};

const CheckTransactionService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isPerformTransactionParams(request.params)) {
    return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
  }

  const paymeTransaction = await PaymeTransactionModel.findOne({
    where: {
      payme_id: request.params.id,
    },
  });

  if (!paymeTransaction) {
    return PaymeErrorResponse(request.id, PaymeErrors.transactionNotFound());
  }

  return {
    id: request.id,
    result: {
      create_time: Number(paymeTransaction.create_time),
      perform_time: Number(paymeTransaction.perform_time),
      cancel_time: Number(paymeTransaction.cancel_time),
      transaction: String(paymeTransaction.id),
      state: paymeTransaction.state,
      reason: paymeTransaction.reason,
    },
  };
};

const isGetStatementParams = (
  params: Record<string, unknown>,
): params is PaymeGetStatementParams =>
  Number.isSafeInteger(params.from) &&
  Number(params.from) >= 0 &&
  Number.isSafeInteger(params.to) &&
  Number(params.to) >= 0 &&
  Number(params.from) <= Number(params.to);

const GetStatementService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!isGetStatementParams(request.params)) {
    return PaymeErrorResponse(request.id, PaymeErrors.invalidRequest());
  }

  const transactions = await PaymeTransactionModel.findAll({
    where: {
      create_time: {
        [Op.between]: [request.params.from, request.params.to],
      },
    },
    order: [
      ["create_time", "ASC"],
      ["id", "ASC"],
    ],
  });

  return {
    id: request.id,
    result: {
      transactions: transactions.map((transaction) => ({
        id: transaction.payme_id,
        time: Number(transaction.payme_time),
        amount: Number(transaction.amount),
        account: transaction.account,
        create_time: Number(transaction.create_time),
        perform_time: Number(transaction.perform_time),
        cancel_time: Number(transaction.cancel_time),
        transaction: String(transaction.id),
        state: transaction.state,
        reason: transaction.reason,
        receivers: transaction.receivers,
      })),
    },
  };
};

export const DispatchPaymeMethodService = async (
  request: PaymeRpcRequest,
): Promise<PaymeRpcResponse> => {
  if (!PAYME_METHODS.has(request.method as PaymeMethodName)) {
    return PaymeErrorResponse(
      request.id,
      PaymeErrors.methodNotFound(request.method),
    );
  }

  if (request.method === "CheckPerformTransaction") {
    return CheckPerformTransactionService(request);
  }

  if (request.method === "CreateTransaction") {
    return CreateTransactionService(request);
  }

  if (request.method === "PerformTransaction") {
    return PerformTransactionService(request);
  }

  if (request.method === "CancelTransaction") {
    return CancelTransactionService(request);
  }

  if (request.method === "CheckTransaction") {
    return CheckTransactionService(request);
  }

  if (request.method === "GetStatement") {
    return GetStatementService(request);
  }

  return PaymeErrorResponse(request.id, PaymeErrors.system());
};
