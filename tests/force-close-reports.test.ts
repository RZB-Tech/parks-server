import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Op } from "sequelize";
import {
  AttractionModel,
  AttractionReportModel,
  AttractionRoundModel,
  CashboxModel,
  CashboxReportModel,
} from "../src/plugins/db/postgresql/db";
import {
  AttractionReportTypes,
  AttractionStatusTypes,
} from "../src/models/postgresql/attraction-model/enums";
import { AttractionReportStatusTypes } from "../src/models/postgresql/attraction-report-model/enums";
import { AttractionRoundStatusTypes } from "../src/models/postgresql/attraction-round-model/enums";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../src/models/postgresql/cashbox-model/enums";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../src/models/postgresql/cashbox-report-model/enums";
import {
  ForceCloseAttractionReportsService,
  ForceCloseCashboxReportsService,
} from "../src/services/report-management-services/ReportManagementServices";

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

test("head cashier force-close closes every active cashbox X report before Z", async (t) => {
  let cashboxUpdate: { values: any; options: any } | undefined;
  let reportFindOptions: any;
  const reportUpdates: Array<{ values: any; options: any }> = [];
  const cashbox = {
    id: 12,
    type: CashboxTypes.PHYSICAL,
    update: async (values: any, options: any) => {
      cashboxUpdate = { values, options };
    },
  } as any;

  t.mock.method(
    CashboxReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(CashboxModel, "findByPk", async () => cashbox);
  t.mock.method(CashboxReportModel, "findAll", async (options: any) => {
    reportFindOptions = options;
    return [
      reportInstance({
        id: 101,
        operator: 7,
        report_type: CashboxReportTypes.XREPORT,
      }),
      reportInstance({
        id: 102,
        operator: 9,
        report_type: CashboxReportTypes.XREPORT,
      }),
      reportInstance({
        id: 201,
        operator: 7,
        report_type: CashboxReportTypes.ZREPORT,
      }),
    ] as any;
  });
  t.mock.method(
    CashboxReportModel,
    "update",
    async (values: any, options: any) => {
      reportUpdates.push({ values, options });
      return [
        options.where.report_type === CashboxReportTypes.XREPORT ? 2 : 1,
      ] as any;
    },
  );

  const result = await ForceCloseCashboxReportsService(12);

  assert.equal("operator" in reportFindOptions.where, false);
  assert.deepEqual(reportFindOptions.where.status[Op.in], [
    CashboxReportStatusTypes.OPEN,
    CashboxReportStatusTypes.STOPPED,
  ]);
  assert.equal(reportUpdates.length, 2);
  assert.equal(
    reportUpdates[0].options.where.report_type,
    CashboxReportTypes.XREPORT,
  );
  assert.equal(
    reportUpdates[1].options.where.report_type,
    CashboxReportTypes.ZREPORT,
  );
  assert.equal(
    reportUpdates[0].values.status,
    CashboxReportStatusTypes.CLOSED,
  );
  assert.ok(reportUpdates[0].values.closed_at instanceof Date);
  assert.equal(cashboxUpdate?.values.status, CashboxStatusTypes.CLOSED);
  assert.equal(result.closed_xreports, 2);
  assert.equal(result.closed_zreports, 1);
  assert.equal(result.finalized_rounds, 0);
  assert.equal(result.source, "cashbox");
  assert.equal(result.source_id, 12);
  assert.equal(result.target_status, CashboxStatusTypes.CLOSED);
});

test("force-close rejects virtual cashboxes", async (t) => {
  t.mock.method(
    CashboxReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 77,
    type: CashboxTypes.VIRTUAL,
  }) as any);

  await assert.rejects(
    () => ForceCloseCashboxReportsService(77),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "VIRTUAL_CASHBOX_OPERATION_NOT_ALLOWED",
  );
});

test("head cashier force-close finalizes attraction rounds and closes all operators reports", async (t) => {
  let attractionUpdate: { values: any; options: any } | undefined;
  let reportFindOptions: any;
  let roundUpdate: { values: any; options: any } | undefined;
  const reportUpdates: Array<{ values: any; options: any }> = [];
  const attraction = {
    id: 7,
    duration: "5",
    update: async (values: any, options: any) => {
      attractionUpdate = { values, options };
    },
  } as any;
  const xReportOne = reportInstance({
    id: 301,
    attraction: 7,
    operator: 21,
    report_type: AttractionReportTypes.XREPORT,
    zreport: 401,
  });
  const xReportTwo = reportInstance({
    id: 302,
    attraction: 7,
    operator: 22,
    report_type: AttractionReportTypes.XREPORT,
    zreport: 401,
  });
  const zReport = reportInstance({
    id: 401,
    attraction: 7,
    operator: 21,
    report_type: AttractionReportTypes.ZREPORT,
  });
  const roundData = {
    id: 501,
    attraction: 7,
    report: 301,
    operator: 21,
    people_count: 0,
    transactions: [],
    status: AttractionRoundStatusTypes.OPEN,
    started_at: new Date("2026-10-05T08:00:00.000Z"),
  };
  const round = {
    ...roundData,
    update: async (values: any, options: any) => {
      roundUpdate = { values, options };
      Object.assign(roundData, values);
    },
    get: () => ({ ...roundData }),
  } as any;

  t.mock.method(
    AttractionReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(AttractionModel, "findByPk", async () => attraction);
  t.mock.method(AttractionReportModel, "findAll", async (options: any) => {
    reportFindOptions = options;
    return [xReportOne, xReportTwo, zReport] as any;
  });
  t.mock.method(AttractionRoundModel, "findAll", async () => [round] as any);
  t.mock.method(
    AttractionReportModel,
    "update",
    async (values: any, options: any) => {
      reportUpdates.push({ values, options });
      return [
        options.where.report_type === AttractionReportTypes.XREPORT ? 2 : 1,
      ] as any;
    },
  );

  const result = await ForceCloseAttractionReportsService(7);

  assert.equal("operator" in reportFindOptions.where, false);
  assert.deepEqual(reportFindOptions.where.status[Op.in], [
    AttractionReportStatusTypes.OPEN,
    AttractionReportStatusTypes.STOPPED,
  ]);
  assert.equal(roundUpdate?.values.status, AttractionRoundStatusTypes.CANCELLED);
  assert.ok(roundUpdate?.values.finished_at instanceof Date);
  assert.equal(reportUpdates.length, 2);
  assert.equal(
    reportUpdates[0].options.where.report_type,
    AttractionReportTypes.XREPORT,
  );
  assert.equal(
    reportUpdates[1].options.where.report_type,
    AttractionReportTypes.ZREPORT,
  );
  assert.equal(
    reportUpdates[0].values.status,
    AttractionReportStatusTypes.CLOSED,
  );
  assert.equal(attractionUpdate?.values.status, AttractionStatusTypes.INACTIVE);
  assert.equal(result.closed_xreports, 2);
  assert.equal(result.closed_zreports, 1);
  assert.equal(result.finalized_rounds, 1);
  assert.equal(result.source, "attraction");
  assert.equal(result.source_id, 7);
});

test("force-close route is restricted to head cashier and superadmin", () => {
  const source = readFileSync(
    "src/routes/report-management-routes/ReportManagementRoutes.ts",
    "utf8",
  );

  assert.match(
    source,
    /\/reports\/:source\/:sourceID\/force-close[\s\S]*?RoleMiddleware\(\["superadmin", "head_cashier"\]\)/,
  );
});
