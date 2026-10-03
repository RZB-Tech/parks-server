import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CashboxReportModel } from "../src/models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../src/models/postgresql/cashbox-report-model/enums";
import { CashboxModel } from "../src/models/postgresql/cashbox-model/CashboxModel";
import { CashboxStatusTypes } from "../src/models/postgresql/cashbox-model/enums";
import { ReopenZReportService } from "../src/services/cashbox-reports-services/CashboxReportsServices";

test("Z-report reopen route is limited to head_operator and head_cashier", () => {
  const routes = readFileSync(
    "src/routes/cashbox-reports-routes/CashboxReportsRoutes.ts",
    "utf8",
  );

  assert.match(
    routes,
    /"\/zreports\/reopen"[\s\S]*?RoleMiddleware\(\["head_operator", "head_cashier"\]\)/,
  );
});

test("a closed Z-report can be reopened and its cashbox becomes active", async (t) => {
  const originalSequelize = CashboxReportModel.sequelize;
  const originalFindOne = CashboxReportModel.findOne;
  const originalFindByPk = CashboxModel.findByPk;

  t.after(() => {
    (CashboxReportModel as any).sequelize = originalSequelize;
    CashboxReportModel.findOne = originalFindOne;
    CashboxModel.findByPk = originalFindByPk;
  });

  const dbTransaction = { LOCK: { UPDATE: "UPDATE" } };
  (CashboxReportModel as any).sequelize = {
    transaction: async (callback: (transaction: any) => Promise<unknown>) =>
      callback(dbTransaction),
  };

  let findOneCall = 0;
  let reportUpdate: Record<string, unknown> | null = null;
  let cashboxUpdate: Record<string, unknown> | null = null;

  CashboxReportModel.findOne = (async () => {
    findOneCall += 1;

    if (findOneCall === 1) {
      return {
        id: 41,
        cashbox: 7,
        report_type: CashboxReportTypes.ZREPORT,
        status: CashboxReportStatusTypes.CLOSED,
        update: async (values: Record<string, unknown>) => {
          reportUpdate = values;
        },
      } as any;
    }

    return null;
  }) as typeof CashboxReportModel.findOne;

  CashboxModel.findByPk = (async () => ({
    id: 7,
    update: async (values: Record<string, unknown>) => {
      cashboxUpdate = values;
    },
  })) as typeof CashboxModel.findByPk;

  const result = await ReopenZReportService(9, { zreport: 41 });

  assert.equal(result, true);
  assert.deepEqual(reportUpdate, {
    status: CashboxReportStatusTypes.OPEN,
    checked_by: null,
    stopped_at: null,
    closed_at: null,
    description: null,
  });
  assert.deepEqual(cashboxUpdate, { status: CashboxStatusTypes.ACTIVE });
});

test("a finalized Z-report cannot be reopened", async (t) => {
  const originalSequelize = CashboxReportModel.sequelize;
  const originalFindOne = CashboxReportModel.findOne;

  t.after(() => {
    (CashboxReportModel as any).sequelize = originalSequelize;
    CashboxReportModel.findOne = originalFindOne;
  });

  (CashboxReportModel as any).sequelize = {
    transaction: async (callback: (transaction: any) => Promise<unknown>) =>
      callback({ LOCK: { UPDATE: "UPDATE" } }),
  };
  CashboxReportModel.findOne = (async () => ({
    id: 41,
    cashbox: 7,
    report_type: CashboxReportTypes.ZREPORT,
    status: CashboxReportStatusTypes.CONFIRMED,
  })) as typeof CashboxReportModel.findOne;

  await assert.rejects(
    ReopenZReportService(9, { zreport: 41 }),
    (error: any) =>
      error?.statusCode === 400 &&
      error?.message === "Only closed Z report can be reopened!",
  );
});
