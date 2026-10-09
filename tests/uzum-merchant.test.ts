import assert from "node:assert/strict";
import { test } from "node:test";
import fastify from "fastify";
import {
  CardModel,
  CardTransactionModel,
  PaymentOrderModel,
  UserModel,
  UzumTransactionModel,
} from "../src/plugins/db/postgresql/db";
import { CardStatusTypes } from "../src/models/postgresql/cards-model/enums";
import {
  CardTransactionType,
  PaymentServiceType,
} from "../src/models/postgresql/card-transactions-model/enums";
import {
  PaymentOrderPurposeTypes,
  PaymentOrderStatusTypes,
  PaymentProviderTypes,
} from "../src/models/postgresql/payment-orders-model/enums";
import { UzumTransactionStateTypes } from "../src/models/postgresql/uzum-transactions-model/enums";
import {
  AssertUzumMerchantAuthorization,
  CheckUzumMerchantPaymentService,
  ConfirmUzumMerchantTransactionService,
  CreateUzumMerchantTransactionService,
  GetUzumMerchantTransactionStatusService,
  ReverseUzumMerchantTransactionService,
  UZUM_MERCHANT_ERROR_CODES,
  UzumMerchantError,
} from "../src/services/payment-services/uzum/UzumServices";
import { CreateClientUzumOrderService } from "../src/services/client/payment-services/PaymentServices";
import { sequelize } from "../src/plugins/db/postgresql/db";
import PaymentsRouter from "../src/routes/payment-routes/PaymentsRoutes";

const onlinePaymentReportServices = require(
  "../src/services/payment-services/OnlinePaymentReportServices",
);

const dbTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
} as any;

const setMerchantEnvironment = (t: any) => {
  const original = {
    enabled: process.env.UZUM_ENABLED,
    username: process.env.UZUM_MERCHANT_USERNAME,
    password: process.env.UZUM_MERCHANT_PASSWORD,
    serviceID: process.env.UZUM_MERCHANT_SERVICE_ID,
    paymentURL: process.env.UZUM_MERCHANT_PAYMENT_URL,
    timeout: process.env.UZUM_CONFIRM_TIMEOUT_MINUTES,
    expirationDisabled: process.env.UZUM_EXPIRATION_DISABLED,
  };

  process.env.UZUM_ENABLED = "true";
  process.env.UZUM_MERCHANT_USERNAME = "uzum-test";
  process.env.UZUM_MERCHANT_PASSWORD = "secret-test";
  process.env.UZUM_MERCHANT_SERVICE_ID = "101202";
  process.env.UZUM_MERCHANT_PAYMENT_URL =
    "https://test.uzumbank.uz/pay/{order_id}";
  process.env.UZUM_CONFIRM_TIMEOUT_MINUTES = "30";
  process.env.UZUM_EXPIRATION_DISABLED = "false";

  t.after(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("UZUM_ENABLED", original.enabled);
    restore("UZUM_MERCHANT_USERNAME", original.username);
    restore("UZUM_MERCHANT_PASSWORD", original.password);
    restore("UZUM_MERCHANT_SERVICE_ID", original.serviceID);
    restore("UZUM_MERCHANT_PAYMENT_URL", original.paymentURL);
    restore("UZUM_CONFIRM_TIMEOUT_MINUTES", original.timeout);
    restore("UZUM_EXPIRATION_DISABLED", original.expirationDisabled);
  });
};

const paymentOrder = (
  status: PaymentOrderStatusTypes = PaymentOrderStatusTypes.PENDING,
) => {
  const order = {
    id: 123,
    user: 8,
    card: 44,
    provider: PaymentProviderTypes.UZUM,
    purpose: PaymentOrderPurposeTypes.CARD_TOPUP,
    status,
    amount: 25_000,
    expires_at: new Date(Date.now() + 30 * 60 * 1000),
    performed_at: null,
    cancelled_at: null,
    update: async (values: Record<string, unknown>) => {
      Object.assign(order, values);
    },
  };
  return order as any;
};

const clientCard = () => {
  const card = {
    id: 44,
    user: 8,
    card: "1000000000044",
    status: CardStatusTypes.ACTIVE,
    balance: 10_000,
    update: async (values: Record<string, unknown>) => {
      Object.assign(card, values);
    },
  };
  return card as any;
};

test("Uzum Merchant Basic auth is checked with configured credentials", (t) => {
  setMerchantEnvironment(t);
  const valid = Buffer.from("uzum-test:secret-test").toString("base64");

  assert.doesNotThrow(() =>
    AssertUzumMerchantAuthorization(`Basic ${valid}`),
  );
  assert.throws(
    () => AssertUzumMerchantAuthorization("Basic invalid"),
    (error: any) =>
      error instanceof UzumMerchantError &&
      error.errorCode === UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED,
  );
});

test("merchant routes return Uzum auth, validation and method error codes", async (t) => {
  setMerchantEnvironment(t);
  const app = fastify();
  await app.register(PaymentsRouter, { prefix: "/api/v1" });
  await app.ready();
  t.after(() => app.close());

  const invalidAuth = await app.inject({
    method: "POST",
    url: "/api/v1/payments/uzum/check",
    headers: {
      authorization: "Basic invalid",
      "content-type": "application/json",
    },
    payload: {
      serviceId: 101202,
      timestamp: Date.now(),
      params: { order_id: "123" },
    },
  });
  assert.equal(invalidAuth.statusCode, 400);
  assert.equal(
    invalidAuth.json().errorCode,
    UZUM_MERCHANT_ERROR_CODES.ACCESS_DENIED,
  );

  const authorization = `Basic ${Buffer.from(
    "uzum-test:secret-test",
  ).toString("base64")}`;
  const missingParameter = await app.inject({
    method: "POST",
    url: "/api/v1/payments/uzum/check",
    headers: { authorization, "content-type": "application/json" },
    payload: {
      serviceId: 101202,
      params: { order_id: "123" },
    },
  });
  assert.equal(missingParameter.statusCode, 400);
  assert.equal(
    missingParameter.json().errorCode,
    UZUM_MERCHANT_ERROR_CODES.REQUIRED_PARAMETER_MISSING,
  );

  const invalidMethod = await app.inject({
    method: "GET",
    url: "/api/v1/payments/uzum/check",
    headers: { authorization },
  });
  assert.equal(invalidMethod.statusCode, 400);
  assert.equal(
    invalidMethod.json().errorCode,
    UZUM_MERCHANT_ERROR_CODES.INVALID_OPERATION,
  );
});

test("check validates order_id and returns order data", async (t) => {
  setMerchantEnvironment(t);
  process.env.UZUM_EXPIRATION_DISABLED = "true";
  const order = paymentOrder();
  order.expires_at = new Date(Date.now() - 60 * 60 * 1000);
  const card = clientCard();

  t.mock.method(PaymentOrderModel, "findByPk", async () => order);
  t.mock.method(CardModel, "findByPk", async () => card);

  const response = await CheckUzumMerchantPaymentService({
    serviceId: 101202,
    timestamp: Date.now(),
    params: { order_id: "123" },
  });

  assert.equal(response.status, "OK");
  assert.equal(response.serviceId, 101202);
  assert.equal("order_id" in response.data, false);
  assert.equal(response.data.amount.value, "25000");
  assert.equal(response.data.card.value, "****0044");
});

test("create stores transId and validates the amount in tiyin", async (t) => {
  setMerchantEnvironment(t);
  const order = paymentOrder();
  const card = clientCard();
  let transactionFindCalls = 0;
  let createdValues: any;

  t.mock.method(
    sequelize,
    "transaction",
    async (callback: any) => callback(dbTransaction),
  );
  t.mock.method(UzumTransactionModel, "findOne", async () => {
    transactionFindCalls += 1;
    return null;
  });
  t.mock.method(PaymentOrderModel, "findByPk", async () => order);
  t.mock.method(CardModel, "findByPk", async () => card);
  t.mock.method(UzumTransactionModel, "create", async (values: any) => {
    createdValues = values;
    return values;
  });

  const response = await CreateUzumMerchantTransactionService({
    serviceId: 101202,
    timestamp: Date.now(),
    transId: "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    params: { order_id: 123 },
    amount: 2_500_000,
  });

  assert.equal(transactionFindCalls, 2);
  assert.equal(response.status, "CREATED");
  assert.equal(response.amount, 2_500_000);
  assert.equal("data" in response, false);
  assert.equal(createdValues.payment_order, 123);
  assert.equal(
    createdValues.uzum_order_id,
    "5c398d7e-76b6-11ee-96da-f3a095c6289d",
  );
  assert.equal(createdValues.redirect_url, null);
  assert.equal(order.status, PaymentOrderStatusTypes.PROCESSING);
});

test("confirm, status and reverse change the card balance exactly once", async (t) => {
  setMerchantEnvironment(t);
  process.env.UZUM_EXPIRATION_DISABLED = "true";
  const order = paymentOrder(PaymentOrderStatusTypes.PROCESSING);
  const card = clientCard();
  const providerTransaction = {
    id: 9,
    payment_order: 123,
    card_transaction: null,
    uzum_order_id: "5c398d7e-76b6-11ee-96da-f3a095c6289d",
    amount: 25_000,
    state: UzumTransactionStateTypes.REGISTERED,
    registered_at: new Date(Date.now() - 60 * 60 * 1000),
    completed_at: null,
    refunded_at: null,
    update: async (values: Record<string, unknown>) => {
      Object.assign(providerTransaction, values);
    },
  } as any;
  const originalTopUp = {
    id: 77,
    cashbox: 4,
    cashbox_report: 88,
  } as any;
  const createdCardTransactions: any[] = [];

  t.mock.method(
    sequelize,
    "transaction",
    async (callback: any) => callback(dbTransaction),
  );
  t.mock.method(UzumTransactionModel, "findOne", async () => providerTransaction);
  t.mock.method(PaymentOrderModel, "findByPk", async () => order);
  t.mock.method(CardModel, "findByPk", async () => card);
  t.mock.method(CardTransactionModel, "findByPk", async () => originalTopUp);
  t.mock.method(
    onlinePaymentReportServices,
    "AddOnlinePaymentToDailyZReportService",
    async () => ({ cashbox: { id: 4 }, report: { id: 88 } }),
  );
  t.mock.method(CardTransactionModel, "create", async (values: any) => {
    createdCardTransactions.push(values);
    return { id: createdCardTransactions.length === 1 ? 77 : 78 } as any;
  });

  const confirmed = await ConfirmUzumMerchantTransactionService({
    serviceId: 101202,
    timestamp: Date.now(),
    transId: providerTransaction.uzum_order_id,
    paymentSource: "UZCARD",
    tariff: null,
    processingReferenceNumber: "000",
    phone: "998901234567",
    cardType: 2,
  });

  assert.equal(confirmed.status, "CONFIRMED");
  assert.equal("data" in confirmed, false);
  assert.equal(card.balance, 35_000);
  assert.equal(order.status, PaymentOrderStatusTypes.PAID);
  assert.equal(providerTransaction.state, UzumTransactionStateTypes.COMPLETED);
  assert.equal(createdCardTransactions[0].type, CardTransactionType.TOPUP);
  assert.equal(
    createdCardTransactions[0].payment_service,
    PaymentServiceType.UZUM,
  );

  const reversed = await ReverseUzumMerchantTransactionService({
    serviceId: 101202,
    timestamp: Date.now(),
    transId: providerTransaction.uzum_order_id,
  });

  assert.equal(reversed.status, "REVERSED");
  assert.equal("data" in reversed, false);
  assert.equal(card.balance, 10_000);
  assert.equal(order.status, PaymentOrderStatusTypes.CANCELLED);
  assert.equal(providerTransaction.state, UzumTransactionStateTypes.REFUNDED);
  assert.equal(createdCardTransactions[1].type, CardTransactionType.REFUND);

  const status = await GetUzumMerchantTransactionStatusService({
    serviceId: 101202,
    timestamp: Date.now(),
    transId: providerTransaction.uzum_order_id,
  });
  assert.equal(status.status, "REVERSED");
  assert.equal(status.amount, 2_500_000);
  assert.equal("order_id" in status.data, false);
  assert.equal(status.data.amount.value, "25000");
  assert.equal(status.data.card.value, "****0044");
});

test("mini-app Uzum order remains pending and returns the configured working link", async (t) => {
  setMerchantEnvironment(t);
  process.env.UZUM_EXPIRATION_DISABLED = "true";
  const order = paymentOrder();
  const card = clientCard();
  const user = {
    id: 8,
    status: "active",
    phone_verified_at: new Date(),
    registered_at: new Date(),
  } as any;
  let createdValues: any;

  t.mock.method(
    sequelize,
    "transaction",
    async (callback: any) => callback(dbTransaction),
  );
  t.mock.method(UserModel, "findOne", async () => user);
  t.mock.method(CardModel, "findOne", async () => card);
  t.mock.method(PaymentOrderModel, "findOne", async () => null);
  t.mock.method(PaymentOrderModel, "findAll", async () => [] as any);
  t.mock.method(PaymentOrderModel, "create", async (values: any) => {
    createdValues = values;
    Object.assign(order, values);
    return order;
  });

  const response = await CreateClientUzumOrderService(777, {
    card: 44,
    amount: 25_000,
  });

  assert.equal(createdValues.status, PaymentOrderStatusTypes.PENDING);
  assert.equal(createdValues.expires_at, null);
  assert.equal(response.order_id, "123");
  assert.equal(response.checkout_url, "https://test.uzumbank.uz/pay/123");
});
