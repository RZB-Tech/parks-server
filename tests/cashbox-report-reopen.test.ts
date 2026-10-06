import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import { ZReportCashboxWithReportsDTO } from "../src/dtos/cashbox-reports-dtos/CashboxReportDto";
import { ClientCashboxDTO } from "../src/dtos/client/cashbox-dtos/CashboxDto";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../src/models/postgresql/cashbox-model/enums";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../src/models/postgresql/cashbox-report-model/enums";
import { RoleTypes } from "../src/models/postgresql/role-model/enums";
import {
  CashboxModel,
  CashboxReportModel,
  EmployeeModel,
  RoleModel,
} from "../src/plugins/db/postgresql/db";
import { getCashboxesSchema } from "../src/routes/cashbox-routes/schema";
import { zReportCashboxWithReportsProperties } from "../src/routes/cashbox-reports-routes/schema";
import { getClientCashboxesSchema } from "../src/routes/client/cashbox-routes/schema";
import { StatusCashboxReportService } from "../src/services/cashbox-reports-services/CashboxReportsServices";

const transaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
} as any;

const closedZReport = () => {
  const report = {
    id: 56,
    cashbox: 12,
    operator: 7,
    zreport: null,
    report_type: CashboxReportTypes.ZREPORT,
    status: CashboxReportStatusTypes.CLOSED,
    description: "Closed by mistake",
    stopped_at: null,
    closed_at: new Date("2026-10-05T12:00:00.000Z"),
    update: async (values: Record<string, unknown>) => {
      Object.assign(report, values);
    },
  };

  return report as any;
};

const mockTransaction = (t: any) => {
  t.mock.method(
    CashboxReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
};

test("head_cashier can reopen a closed physical cashbox Z-report", async (t) => {
  const report = closedZReport();
  let reportFindCalls = 0;
  let activeReportFindOptions: any;
  let cashboxUpdate: any;

  mockTransaction(t);
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 12,
    type: CashboxTypes.PHYSICAL,
  }) as any);
  t.mock.method(EmployeeModel, "findByPk", async () => ({
    id: 9,
    role: 4,
  }) as any);
  t.mock.method(RoleModel, "findByPk", async () => ({
    id: 4,
    name: RoleTypes.HEADCASHIER,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async (options: any) => {
    reportFindCalls += 1;
    if (reportFindCalls === 1) return report;
    activeReportFindOptions = options;
    return null;
  });
  t.mock.method(CashboxModel, "update", async (values: any) => {
    cashboxUpdate = values;
    return [1] as any;
  });

  const result = await StatusCashboxReportService(
    9,
    { cashboxID: 12 },
    {
      report: 56,
      report_type: CashboxReportTypes.ZREPORT,
      status: CashboxReportStatusTypes.OPEN,
    },
  );

  assert.equal(result, true);
  assert.equal(report.status, CashboxReportStatusTypes.OPEN);
  assert.equal(report.description, null);
  assert.equal(report.stopped_at, null);
  assert.equal(report.closed_at, null);
  assert.equal(
    activeReportFindOptions.where.id[Op.ne],
    56,
  );
  assert.deepEqual(activeReportFindOptions.where.status[Op.in], [
    CashboxReportStatusTypes.OPEN,
    CashboxReportStatusTypes.STOPPED,
  ]);
  assert.deepEqual(cashboxUpdate, {
    status: CashboxStatusTypes.ACTIVE,
  });
});

test("cashier cannot reopen a closed cashbox Z-report", async (t) => {
  mockTransaction(t);
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 12,
    type: CashboxTypes.PHYSICAL,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async () => closedZReport());
  t.mock.method(EmployeeModel, "findByPk", async () => ({
    id: 9,
    role: 4,
  }) as any);
  t.mock.method(RoleModel, "findByPk", async () => ({
    id: 4,
    name: RoleTypes.CASHIER,
  }) as any);

  await assert.rejects(
    StatusCashboxReportService(
      9,
      { cashboxID: 12 },
      {
        report: 56,
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
    ),
    (error: any) =>
      error?.statusCode === 403 &&
      error?.message ===
        "Only head_cashier or superadmin can reopen a closed Z report!",
  );
});

test("closed cashbox X-report cannot be reopened", async (t) => {
  const report = closedZReport();
  report.report_type = CashboxReportTypes.XREPORT;

  mockTransaction(t);
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 12,
    type: CashboxTypes.PHYSICAL,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async () => report);

  await assert.rejects(
    StatusCashboxReportService(
      9,
      { cashboxID: 12 },
      {
        report: 56,
        report_type: CashboxReportTypes.XREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
    ),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "Closed X report cannot be reopened!",
  );
});

test("virtual cashbox Z-report cannot be manually reopened", async (t) => {
  mockTransaction(t);
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 12,
    type: CashboxTypes.VIRTUAL,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async () => closedZReport());

  await assert.rejects(
    StatusCashboxReportService(
      9,
      { cashboxID: 12 },
      {
        report: 56,
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
    ),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "VIRTUAL_CASHBOX_OPERATION_NOT_ALLOWED",
  );
});

test("closed cashbox Z-report cannot reopen while another Z-report is active", async (t) => {
  const report = closedZReport();
  let reportFindCalls = 0;

  mockTransaction(t);
  t.mock.method(CashboxModel, "findByPk", async () => ({
    id: 12,
    type: CashboxTypes.PHYSICAL,
  }) as any);
  t.mock.method(EmployeeModel, "findByPk", async () => ({
    id: 9,
    role: 4,
  }) as any);
  t.mock.method(RoleModel, "findByPk", async () => ({
    id: 4,
    name: RoleTypes.HEADCASHIER,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async () => {
    reportFindCalls += 1;
    return reportFindCalls === 1
      ? report
      : ({ id: 57, status: CashboxReportStatusTypes.OPEN } as any);
  });

  await assert.rejects(
    StatusCashboxReportService(
      9,
      { cashboxID: 12 },
      {
        report: 56,
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.OPEN,
      },
    ),
    (error: any) =>
      error?.statusCode === 409 &&
      error?.message === "Cashbox already has an active Z report!",
  );
});

test("cashbox DTOs and schemas expose physical or virtual type", () => {
  const cashbox = {
    id: 12,
    name: "Online payments",
    place: "Bot",
    status: CashboxStatusTypes.ACTIVE,
    type: CashboxTypes.VIRTUAL,
    description: null,
    latitude: null,
    longitude: null,
    reports: [],
  } as any;

  assert.equal(ZReportCashboxWithReportsDTO(cashbox).type, CashboxTypes.VIRTUAL);
  assert.equal(ClientCashboxDTO(cashbox).type, CashboxTypes.VIRTUAL);
  assert.deepEqual(
    (zReportCashboxWithReportsProperties.type as any).enum,
    Object.values(CashboxTypes),
  );
  assert.deepEqual(
    (getClientCashboxesSchema.response[200] as any).properties.data.properties
      .cashboxes.items.properties.type.enum,
    Object.values(CashboxTypes),
  );
  assert.equal(
    (getCashboxesSchema.response[200] as any).properties.data.properties
      .cashboxes.items.type,
    "object",
  );
});
