import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Op } from "sequelize";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentType,
} from "../src/models/postgresql/card-transactions-model/enums";
import { CashboxReportStatusTypes } from "../src/models/postgresql/cashbox-report-model/enums";
import {
  CardStatusTypes,
  CardType,
} from "../src/models/postgresql/cards-model/enums";
import {
  GetTopUpCancellationBlockReason,
  GetTopUpReportAmounts,
} from "../src/utils/topUpCancellation";
import {
  CancelTopUpTransactionService,
  GetCardTransactionsService,
} from "../src/services/card-transactions-services/CardTransactionsServices";
import { CardTransactionModel } from "../src/models/postgresql/card-transactions-model/CardTransactionModel";
import { CardTransactionReversalModel } from "../src/models/postgresql/card-transaction-reversal-model/CardTransactionReversalModel";
import { CardModel } from "../src/models/postgresql/cards-model/CardModel";
import { CashboxReportModel } from "../src/models/postgresql/cashbox-report-model/CashboxReportModel";
import { CardBatchModel } from "../src/models/postgresql/card-batches-model/CardBatchModel";

const manualTopUp = {
  type: CardTransactionType.TOPUP,
  status: CardTransactionStatusTypes.SUCCESS,
  payment_type: PaymentType.CASH,
  payment_card_type: null,
  payment_service: null,
  amount: 100_000,
  activation_amount: 0,
};

test("top-up cancellation eligibility blocks unsafe reversals", () => {
  assert.equal(
    GetTopUpCancellationBlockReason(
      manualTopUp,
      100_000,
      CashboxReportStatusTypes.OPEN,
    ),
    null,
  );

  assert.equal(
    GetTopUpCancellationBlockReason(
      { ...manualTopUp, payment_type: PaymentType.ONLINE },
      100_000,
      CashboxReportStatusTypes.OPEN,
    ),
    "ONLINE_TOPUP_REQUIRES_PROVIDER_REFUND",
  );
  const activationTopUp = {
    ...manualTopUp,
    activation_amount: 12_000,
    balance_before: 0,
  };

  assert.equal(
    GetTopUpCancellationBlockReason(
      activationTopUp,
      100_000,
      CashboxReportStatusTypes.OPEN,
      {
        hasLaterTransactions: false,
        cardStatus: CardStatusTypes.ACTIVE,
      },
    ),
    null,
  );
  assert.equal(
    GetTopUpCancellationBlockReason(
      activationTopUp,
      100_000,
      CashboxReportStatusTypes.OPEN,
      {
        hasLaterTransactions: true,
        cardStatus: CardStatusTypes.ACTIVE,
      },
    ),
    "ACTIVATION_CARD_HAS_LATER_TRANSACTIONS",
  );
  assert.equal(
    GetTopUpCancellationBlockReason(
      activationTopUp,
      99_999,
      CashboxReportStatusTypes.OPEN,
      {
        hasLaterTransactions: false,
        cardStatus: CardStatusTypes.ACTIVE,
      },
    ),
    "ACTIVATION_CARD_BALANCE_MISMATCH",
  );
  assert.equal(
    GetTopUpCancellationBlockReason(
      manualTopUp,
      99_999,
      CashboxReportStatusTypes.OPEN,
    ),
    "CARD_BALANCE_IS_INSUFFICIENT",
  );
  assert.equal(
    GetTopUpCancellationBlockReason(
      manualTopUp,
      100_000,
      CashboxReportStatusTypes.CONFIRMED,
    ),
    "Z_REPORT_IS_FINALIZED",
  );
});

test("top-up report reversal targets the original payment counters", () => {
  assert.deepEqual(GetTopUpReportAmounts(manualTopUp), {
    total_amount: 100_000,
    cash_amount: 100_000,
  });

  assert.deepEqual(
    GetTopUpReportAmounts({
      ...manualTopUp,
      payment_type: PaymentType.CARD,
      payment_card_type: PaymentCardType.HUMO,
    }),
    {
      total_amount: 100_000,
      card_amount: 100_000,
      humo_amount: 100_000,
    },
  );

  assert.deepEqual(
    GetTopUpReportAmounts({
      ...manualTopUp,
      activation_amount: 12_000,
      balance_before: 0,
    }),
    {
      total_amount: 112_000,
      cash_amount: 112_000,
      activated_cards_count: 1,
      activated_cards_amount: 12_000,
    },
  );
});

test("reversal model prevents cancelling one top-up twice", () => {
  const attributes = CardTransactionReversalModel.getAttributes();

  assert.equal(attributes.original_transaction.unique, true);
  assert.equal(attributes.refund_transaction.unique, true);
  assert.equal(attributes.reason.allowNull, false);
});

test("transaction search rejects simultaneous transaction and card filters", async () => {
  await assert.rejects(
    GetCardTransactionsService(
      9,
      { cashboxID: 1 },
      { transaction_id: 10, card_number: "100000001" },
    ),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "USE_TRANSACTION_ID_OR_CARD_NUMBER",
  );
});

test("activated card filter cannot be combined with another transaction type", async () => {
  await assert.rejects(
    GetCardTransactionsService(
      9,
      { cashboxID: 1 },
      { type: CardTransactionType.REFUND, activated_card: true },
    ),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "ACTIVATED_CARD_FILTER_REQUIRES_TOPUP",
  );
});

test("top-up listing is consolidated and cancellation remains head_cashier-only", () => {
  const routes = readFileSync(
    "src/routes/card-transactions-routes/CardTransactionsRoutes.ts",
    "utf8",
  );

  assert.doesNotMatch(routes, /\/cards\/cashboxes\/:cashboxID\/topups/);
  assert.match(routes, /\/cards\/cashboxes\/:cashboxID\/transactions/);
  assert.match(
    routes,
    /\/cards\/cashboxes\/:cashboxID\/transactions\/:transactionID\/cancel[\s\S]*?RoleMiddleware\(\["head_cashier"\]\)/,
  );
});

test("cashbox transaction filters expose refund reason and top-up reversal", async (t) => {
  const originalFindAndCountAll = CardTransactionModel.findAndCountAll;
  let queryOptions: any = null;

  t.after(() => {
    CardTransactionModel.findAndCountAll = originalFindAndCountAll;
  });

  CardTransactionModel.findAndCountAll = (async (options: any) => {
    queryOptions = options;

    return {
      count: 1,
      rows: [
        {
          get: () => ({
            id: 202,
            card: 11,
            cashbox: 7,
            operator: 9,
            type: CardTransactionType.REFUND,
            payment_type: PaymentType.CASH,
            payment_card_type: null,
            payment_service: null,
            amount: 100_000,
            activation_amount: 0,
            description: "Wrong amount",
            balance_before: 150_000,
            balance_after: 50_000,
            status: CardTransactionStatusTypes.SUCCESS,
            xreport: null,
            createdAt: new Date("2026-10-02T10:00:00.000Z"),
            cards: {
              id: 11,
              card: "100000001",
              balance: 50_000,
              status: "active",
            },
            operators: {
              id: 9,
              firstname: "Head",
              lastname: "Cashier",
              file: null,
            },
            cashbox_reports: null,
            reversal: null,
            topup_reversal: {
              id: 303,
              original_transaction: 101,
              refund_transaction: 202,
              cancelled_by: 9,
              reason: "Wrong amount",
              cancelled_at: new Date("2026-10-02T10:00:00.000Z"),
            },
          }),
        },
      ],
    } as any;
  }) as any;

  const result = await GetCardTransactionsService(
    9,
    { cashboxID: 7 },
    { type: CardTransactionType.REFUND, transaction_id: 202 },
  );

  assert.deepEqual(queryOptions.where, {
    cashbox: 7,
    type: CardTransactionType.REFUND,
    id: 202,
  });
  assert.equal(result.transactions[0].reason, "Wrong amount");
  assert.equal(result.transactions[0].can_cancel, null);
  assert.equal(result.transactions[0].topup_reversal.original_transaction, 101);
  assert.equal(result.transactions[0].topup_reversal.reason, "Wrong amount");
});

test("activated card filter returns first top-ups with the activation fee total", async (t) => {
  const originalFindAndCountAll = CardTransactionModel.findAndCountAll;
  const originalFindAll = CardTransactionModel.findAll;
  const originalFindReports = CashboxReportModel.findAll;
  let queryOptions: any = null;

  t.after(() => {
    CardTransactionModel.findAndCountAll = originalFindAndCountAll;
    CardTransactionModel.findAll = originalFindAll;
    CashboxReportModel.findAll = originalFindReports;
  });

  CardTransactionModel.findAndCountAll = (async (options: any) => {
    queryOptions = options;

    return {
      count: 1,
      rows: [
        {
          get: () => ({
            id: 101,
            card: 11,
            cashbox: 7,
            operator: 9,
            type: CardTransactionType.TOPUP,
            payment_type: PaymentType.CASH,
            payment_card_type: null,
            payment_service: null,
            amount: 100_000,
            activation_amount: 12_000,
            description: null,
            balance_before: 0,
            balance_after: 100_000,
            status: CardTransactionStatusTypes.SUCCESS,
            xreport: null,
            cashbox_report: 501,
            createdAt: new Date("2026-10-02T10:00:00.000Z"),
            cards: {
              id: 11,
              card: "100000001",
              balance: 100_000,
              status: "active",
            },
            operators: null,
            cashbox_reports: { zreport: 601 },
            reversal: null,
            topup_reversal: null,
          }),
        },
      ],
    } as any;
  }) as any;
  CardTransactionModel.findAll = (async () => [
    { card: 11, latest_transaction_id: 101 },
  ]) as any;
  CashboxReportModel.findAll = (async () => [
    { id: 601, status: CashboxReportStatusTypes.OPEN },
  ]) as any;

  const result = await GetCardTransactionsService(
    9,
    { cashboxID: 7 },
    { activated_card: true, transaction_id: 101 },
  );

  assert.equal(queryOptions.where.type, CardTransactionType.TOPUP);
  assert.equal(queryOptions.where.activation_amount[Op.gt], 0);
  assert.equal(result.transactions[0].amount, 100_000);
  assert.equal(result.transactions[0].activation_amount, 12_000);
  assert.equal(result.transactions[0].total_amount, 112_000);
  assert.equal(result.transactions[0].can_cancel, true);
  assert.equal(result.transactions[0].cannot_cancel_reason, null);
});

test("cancelling a manual top-up is atomic across balance and reports", async (t) => {
  const sequelize = CardTransactionModel.sequelize! as any;
  const originalMethods = {
    transaction: sequelize.transaction,
    findTransaction: CardTransactionModel.findOne,
    createTransaction: CardTransactionModel.create,
    findReversal: CardTransactionReversalModel.findOne,
    createReversal: CardTransactionReversalModel.create,
    findCard: CardModel.findByPk,
    findReport: CashboxReportModel.findOne,
  };

  t.after(() => {
    sequelize.transaction = originalMethods.transaction;
    CardTransactionModel.findOne = originalMethods.findTransaction;
    CardTransactionModel.create = originalMethods.createTransaction;
    CardTransactionReversalModel.findOne = originalMethods.findReversal;
    CardTransactionReversalModel.create = originalMethods.createReversal;
    CardModel.findByPk = originalMethods.findCard;
    CashboxReportModel.findOne = originalMethods.findReport;
  });

  const dbTransaction = { LOCK: { UPDATE: "UPDATE" } };
  sequelize.transaction = async (callback: any) => callback(dbTransaction);

  const originalTransaction: any = {
    id: 101,
    card: 11,
    cashbox: 7,
    cashbox_report: 501,
    ...manualTopUp,
    update: async (values: any) => Object.assign(originalTransaction, values),
  };
  const card: any = {
    id: 11,
    card: "100000001",
    balance: 150_000,
    update: async (values: any) => Object.assign(card, values),
  };
  const makeReport = (values: Record<string, unknown>) => {
    const report: any = {
      ...values,
      get: (field: string) => report[field],
      update: async (updates: any) => Object.assign(report, updates),
    };
    return report;
  };
  const xReport = makeReport({
    id: 501,
    zreport: 601,
    status: CashboxReportStatusTypes.CLOSED,
    total_amount: 300_000,
    cash_amount: 200_000,
  });
  const zReport = makeReport({
    id: 601,
    status: CashboxReportStatusTypes.CLOSED,
    total_amount: 500_000,
    cash_amount: 400_000,
  });
  let createdRefund: any = null;
  let createdReversal: any = null;

  CardTransactionModel.findOne = (async () => originalTransaction) as any;
  CardTransactionReversalModel.findOne = (async () => null) as any;
  CardModel.findByPk = (async () => card) as any;
  CashboxReportModel.findOne = (async (options: any) =>
    Number(options.where.id) === 501 ? xReport : zReport) as any;
  CardTransactionModel.create = (async (values: any) => {
    createdRefund = values;
    return { id: 202 } as any;
  }) as any;
  CardTransactionReversalModel.create = (async (values: any) => {
    createdReversal = values;
    return { id: 303 } as any;
  }) as any;

  const result = await CancelTopUpTransactionService(
    9,
    { cashboxID: 7, transactionID: 101 },
    { reason: "Wrong amount" },
  );

  assert.equal(card.balance, 50_000);
  assert.equal(originalTransaction.status, CardTransactionStatusTypes.CANCELLED);
  assert.equal(createdRefund.type, CardTransactionType.REFUND);
  assert.equal(createdRefund.balance_before, 150_000);
  assert.equal(createdRefund.balance_after, 50_000);
  assert.equal(createdRefund.operator, 9);
  assert.equal(xReport.total_amount, 200_000);
  assert.equal(xReport.cash_amount, 100_000);
  assert.equal(zReport.total_amount, 400_000);
  assert.equal(zReport.cash_amount, 300_000);
  assert.equal(createdReversal.original_transaction, 101);
  assert.equal(createdReversal.refund_transaction, 202);
  assert.equal(result.id, 303);
});

test("cancelling an activation top-up restores the card to a new state", async (t) => {
  const sequelize = CardTransactionModel.sequelize! as any;
  const originalMethods = {
    transaction: sequelize.transaction,
    findTransaction: CardTransactionModel.findOne,
    createTransaction: CardTransactionModel.create,
    findReversal: CardTransactionReversalModel.findOne,
    createReversal: CardTransactionReversalModel.create,
    findCard: CardModel.findByPk,
    findBatch: CardBatchModel.findByPk,
    findReport: CashboxReportModel.findOne,
  };

  t.after(() => {
    sequelize.transaction = originalMethods.transaction;
    CardTransactionModel.findOne = originalMethods.findTransaction;
    CardTransactionModel.create = originalMethods.createTransaction;
    CardTransactionReversalModel.findOne = originalMethods.findReversal;
    CardTransactionReversalModel.create = originalMethods.createReversal;
    CardModel.findByPk = originalMethods.findCard;
    CardBatchModel.findByPk = originalMethods.findBatch;
    CashboxReportModel.findOne = originalMethods.findReport;
  });

  const dbTransaction = { LOCK: { UPDATE: "UPDATE" } };
  sequelize.transaction = async (callback: any) => callback(dbTransaction);

  const originalTransaction: any = {
    id: 101,
    card: 11,
    cashbox: 7,
    cashbox_report: 501,
    ...manualTopUp,
    balance_before: 0,
    balance_after: 100_000,
    activation_amount: 12_000,
    update: async (values: any) => Object.assign(originalTransaction, values),
  };
  const card: any = {
    id: 11,
    batch: 4,
    card: "100000001",
    balance: 100_000,
    status: CardStatusTypes.ACTIVE,
    type: CardType.CLASSIC,
    user: 55,
    activated_at: new Date("2026-10-02T09:00:00.000Z"),
    bound_at: new Date("2026-10-02T09:05:00.000Z"),
    returned_at: null,
    return_description: null,
    update: async (values: any) => Object.assign(card, values),
  };
  const batch: any = {
    id: 4,
    type: CardType.CLASSIC,
    active_cards: 1,
    inactive_cards: 9,
    update: async (values: any) => Object.assign(batch, values),
  };
  const makeReport = (values: Record<string, unknown>) => {
    const report: any = {
      ...values,
      get: (field: string) => report[field],
      update: async (updates: any) => Object.assign(report, updates),
    };
    return report;
  };
  const xReport = makeReport({
    id: 501,
    zreport: 601,
    status: CashboxReportStatusTypes.OPEN,
    total_amount: 112_000,
    cash_amount: 112_000,
    activated_cards_count: 1,
    activated_cards_amount: 12_000,
  });
  const zReport = makeReport({
    id: 601,
    status: CashboxReportStatusTypes.OPEN,
    total_amount: 312_000,
    cash_amount: 312_000,
    activated_cards_count: 2,
    activated_cards_amount: 24_000,
  });
  let createdRefund: any = null;
  let createdReversal: any = null;

  CardTransactionModel.findOne = (async (options: any) =>
    Number(options.where.id) === 101 ? originalTransaction : null) as any;
  CardTransactionReversalModel.findOne = (async () => null) as any;
  CardModel.findByPk = (async () => card) as any;
  CardBatchModel.findByPk = (async () => batch) as any;
  CashboxReportModel.findOne = (async (options: any) =>
    Number(options.where.id) === 501 ? xReport : zReport) as any;
  CardTransactionModel.create = (async (values: any) => {
    createdRefund = values;
    return { id: 202 } as any;
  }) as any;
  CardTransactionReversalModel.create = (async (values: any) => {
    createdReversal = values;
    return { id: 303 } as any;
  }) as any;

  const result = await CancelTopUpTransactionService(
    9,
    { cashboxID: 7, transactionID: 101 },
    { reason: "Activation top-up was incorrect" },
  );

  assert.equal(card.balance, 0);
  assert.equal(card.status, CardStatusTypes.INACTIVE);
  assert.equal(card.user, null);
  assert.equal(card.activated_at, null);
  assert.equal(card.bound_at, null);
  assert.equal(batch.active_cards, 0);
  assert.equal(batch.inactive_cards, 10);
  assert.equal(originalTransaction.status, CardTransactionStatusTypes.CANCELLED);
  assert.equal(createdRefund.amount, 100_000);
  assert.equal(createdRefund.activation_amount, 12_000);
  assert.equal(createdRefund.balance_before, 100_000);
  assert.equal(createdRefund.balance_after, 0);
  assert.equal(createdReversal.amount, 112_000);
  assert.equal(xReport.total_amount, 0);
  assert.equal(xReport.cash_amount, 0);
  assert.equal(xReport.activated_cards_count, 0);
  assert.equal(xReport.activated_cards_amount, 0);
  assert.equal(zReport.total_amount, 200_000);
  assert.equal(zReport.cash_amount, 200_000);
  assert.equal(zReport.activated_cards_count, 1);
  assert.equal(zReport.activated_cards_amount, 12_000);
  assert.equal(result.amount, 100_000);
  assert.equal(result.activation_amount, 12_000);
  assert.equal(result.total_amount, 112_000);
});
