import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import { AttractionModel } from "../src/models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../src/models/postgresql/attraction-model/enums";
import { AttractionReportModel } from "../src/models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../src/models/postgresql/attraction-report-model/enums";
import { AttractionRoundModel } from "../src/models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../src/models/postgresql/attraction-round-model/enums";
import { CardTransactionModel } from "../src/models/postgresql/card-transactions-model/CardTransactionModel";
import {
  PaymentType,
} from "../src/models/postgresql/card-transactions-model/enums";
import { CardType } from "../src/models/postgresql/cards-model/enums";
import { EmployeeModel } from "../src/models/postgresql/employees-model/EmployeeModel";
import { RoleModel } from "../src/models/postgresql/role-model/RoleModel";
import {
  AutoCloseUnclosedAttractionReportsService,
  GetPaymentAttractionService,
  OpenAttractionReportService,
  UpdateAttractionReportStatusService,
} from "../src/services/attraction-reports-services/AttractionReportsServices";
import { FinalizeAttractionRoundService } from "../src/services/attraction-rounds-services/AttractionRoundsServices";

const transaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
} as any;

const reportInstance = (data: Record<string, unknown>) => ({
  ...data,
  get: () => ({ ...data }),
  increment: async () => undefined,
  update: async () => undefined,
}) as any;

test("payment attraction lookup no longer requires an operator assignment", async (t) => {
  let findOptions: any;
  const attraction = { id: 7, seats: 12 } as any;

  t.mock.method(AttractionModel, "findOne", async (options: any) => {
    findOptions = options;
    return attraction;
  });

  const result = await GetPaymentAttractionService(7, transaction);

  assert.equal(result, attraction);
  assert.deepEqual(findOptions.where, {
    id: 7,
    status: AttractionStatusTypes.ACTIVE,
  });
  assert.equal("operator" in findOptions.where, false);
});

test("opening a report is idempotent for its current operator", async (t) => {
  let reportFindAllCalls = 0;
  let staleXReportFindOptions: any;
  let activeReportFindOptions: any;
  const activeReport = reportInstance({
    id: 55,
    attraction: 7,
    operator: 9,
    report_type: AttractionReportTypes.XREPORT,
    status: AttractionReportStatusTypes.OPEN,
  });

  t.mock.method(
    AttractionReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(AttractionReportModel, "findAll", async (options: any) => {
    reportFindAllCalls += 1;
    if (reportFindAllCalls === 1) staleXReportFindOptions = options;
    return [] as any;
  });
  t.mock.method(AttractionModel, "findByPk", async () => ({
    id: 7,
    device: 123,
  }) as any);
  t.mock.method(AttractionReportModel, "findOne", async (options: any) => {
    activeReportFindOptions = options;
    return activeReport;
  });

  const result = await OpenAttractionReportService(9, 123, {
    attractionID: "7",
  });

  assert.equal(result.id, 55);
  assert.equal(reportFindAllCalls, 2);
  assert.equal(staleXReportFindOptions.where.attraction, 7);
  assert.equal("opened_at" in activeReportFindOptions.where, false);
  assert.deepEqual(activeReportFindOptions.where.status[Op.in], [
    AttractionReportStatusTypes.OPEN,
    AttractionReportStatusTypes.STOPPED,
  ]);
});

test("another operator cannot open a report while the attraction is occupied", async (t) => {
  const activeReport = reportInstance({
    id: 55,
    attraction: 7,
    operator: 9,
    report_type: AttractionReportTypes.XREPORT,
    status: AttractionReportStatusTypes.OPEN,
  });

  t.mock.method(
    AttractionReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(AttractionReportModel, "findAll", async () => [] as any);
  t.mock.method(AttractionModel, "findByPk", async () => ({
    id: 7,
    device: 123,
  }) as any);
  t.mock.method(AttractionReportModel, "findOne", async () => activeReport);

  await assert.rejects(
    () =>
      OpenAttractionReportService(10, 123, {
        attractionID: "7",
      }),
    (error: any) => {
      assert.equal(error.statusCode, 409);
      assert.equal(
        error.message,
        "Another operator already has an active X report on this attraction!",
      );
      return true;
    },
  );
});

test("report owner can stop an X-report without an attraction assignment", async (t) => {
  let reportUpdate: any;
  const attraction = {
    id: 7,
    update: async () => undefined,
  } as any;
  const report = {
    id: 55,
    attraction: 7,
    operator: 9,
    zreport: 56,
    report_type: AttractionReportTypes.XREPORT,
    status: AttractionReportStatusTypes.OPEN,
    update: async (values: any) => {
      reportUpdate = values;
      Object.assign(report, values);
    },
    get: () => ({ ...report }),
  } as any;

  t.mock.method(
    AttractionReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(AttractionModel, "findByPk", async () => attraction);
  t.mock.method(EmployeeModel, "findByPk", async () => ({ id: 9, role: 4 }) as any);
  t.mock.method(RoleModel, "findByPk", async () => ({ id: 4, name: "operator" }) as any);
  t.mock.method(AttractionReportModel, "findOne", async () => report);
  t.mock.method(AttractionReportModel, "update", async () => [1] as any);

  const result = await UpdateAttractionReportStatusService(
    9,
    { attractionID: "7", reportID: "55" },
    { status: AttractionReportStatusTypes.STOPPED },
  );

  assert.equal(result, true);
  assert.equal(reportUpdate.status, AttractionReportStatusTypes.STOPPED);
  assert.ok(reportUpdate.stopped_at instanceof Date);
});

test("round finalization preserves paid totals without an assignment", async (t) => {
  let roundUpdate: any;
  let xIncrement: any;
  let zIncrement: any;
  const round = {
    id: 70,
    report: 55,
    attraction: 7,
    operator: 9,
    round_number: 1,
    transactions: [100],
    status: AttractionRoundStatusTypes.OPEN,
    people_count: 2,
    started_at: new Date("2026-10-01T18:00:00.000Z"),
    update: async (values: any) => {
      roundUpdate = values;
      Object.assign(round, values);
    },
    get: () => ({ ...round }),
  } as any;
  const xReport = reportInstance({ id: 55, attraction: 7, zreport: 56 });
  const zReport = reportInstance({ id: 56, attraction: 7 });

  xReport.increment = async (values: any) => {
    xIncrement = values;
  };
  zReport.increment = async (values: any) => {
    zIncrement = values;
  };
  t.mock.method(CardTransactionModel, "findAll", async () => [
    {
      get: () => ({
        promotion: null,
        people_count: 2,
        payment_type: PaymentType.CARD,
        amount: 20_000,
        sale_unit_price: 10_000,
        cards: { type: CardType.CLASSIC },
      }),
    },
  ] as any);

  await FinalizeAttractionRoundService({
    round,
    xReport,
    zReport,
    attractionDuration: "5",
    transaction,
  });

  assert.equal(roundUpdate.status, AttractionRoundStatusTypes.FINISHED);
  assert.equal(xIncrement.total_rounds, 1);
  assert.equal(zIncrement.total_rounds, 1);
  assert.equal(zIncrement.total_people, 2);
  assert.equal(zIncrement.total_classic, 2);
  assert.equal(zIncrement.paid_amount, 20_000);
  assert.equal(zIncrement.total_amount, 20_000);
});

test("03:00 recovery cancels an empty round and closes its reports", async (t) => {
  const cutoff = new Date("2026-10-01T22:00:00.000Z");
  const xReport = reportInstance({ id: 55, attraction: 7, zreport: 56 });
  const zReport = reportInstance({ id: 56, attraction: 7, zreport: null });
  let roundUpdate: any;
  const round = {
    id: 70,
    report: 55,
    attraction: 7,
    operator: 9,
    round_number: 1,
    transactions: [],
    status: AttractionRoundStatusTypes.OPEN,
    people_count: 0,
    started_at: new Date("2026-10-01T18:00:00.000Z"),
    update: async (values: any) => {
      roundUpdate = values;
      Object.assign(round, values);
    },
    get: () => ({ ...round }),
  } as any;
  const reportUpdates: any[] = [];
  let reportFindAllCall = 0;

  t.mock.method(
    AttractionReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(AttractionReportModel, "findAll", async () => {
    reportFindAllCall += 1;

    if (reportFindAllCall === 1) return [xReport] as any;
    if (reportFindAllCall === 2) return [zReport] as any;
    if (reportFindAllCall === 3) return [zReport] as any;
    return [] as any;
  });
  t.mock.method(AttractionRoundModel, "findAll", async () => [round] as any);
  t.mock.method(AttractionModel, "findAll", async () => [
    { id: 7, duration: "5" },
  ] as any);
  t.mock.method(
    AttractionReportModel,
    "update",
    async (values: any, options: any) => {
      reportUpdates.push({ values, options });
      return [1] as any;
    },
  );
  t.mock.method(AttractionModel, "update", async () => [1] as any);

  const result = await AutoCloseUnclosedAttractionReportsService(cutoff);

  assert.equal(roundUpdate.status, AttractionRoundStatusTypes.CANCELLED);
  assert.equal(roundUpdate.finished_at.toISOString(), cutoff.toISOString());
  assert.equal(reportUpdates.length, 2);
  assert.equal(reportUpdates[0].values.status, AttractionReportStatusTypes.CLOSED);
  assert.equal(
    reportUpdates[0].values.closed_at.toISOString(),
    cutoff.toISOString(),
  );
  assert.equal(reportUpdates[1].values.status, AttractionReportStatusTypes.CLOSED);
  assert.equal(result.finalized_rounds, 1);
  assert.equal(result.closed_xreports, 1);
  assert.equal(result.closed_zreports, 1);
});
