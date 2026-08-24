import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import { CashboxReportStatusTypes } from "../src/models/postgresql/cashbox-report-model/enums";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../src/models/postgresql/cashbox-model/enums";
import {
  CashboxModel,
  CashboxReportModel,
} from "../src/plugins/db/postgresql/db";
import {
  CloseOnlineDailyZReportService,
  GetOrCreateOnlineDailyZReportService,
  ONLINE_PAYMENTS_CASHBOX_KEY,
} from "../src/services/payment-services/OnlinePaymentReportServices";

const transaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
} as any;

test("scheduled online Z-report close confirms reports as the system", async (t) => {
  const reportUpdates: Array<{ values: any; options: any }> = [];
  let cashboxFindOptions: any;
  let cashboxUpdate: { values: any; options: any } | undefined;

  t.mock.method(
    CashboxReportModel.sequelize!,
    "transaction",
    async (callback: any) => callback(transaction),
  );
  t.mock.method(CashboxModel, "findOne", async (options: any) => {
    cashboxFindOptions = options;
    return { id: 77 } as any;
  });
  t.mock.method(
    CashboxReportModel,
    "update",
    async (values: any, options: any) => {
      reportUpdates.push({ values, options });
      return [reportUpdates.length === 1 ? 2 : 1] as any;
    },
  );
  t.mock.method(CashboxReportModel, "count", async () => 0);
  t.mock.method(
    CashboxModel,
    "update",
    async (values: any, options: any) => {
      cashboxUpdate = { values, options };
      return [1] as any;
    },
  );

  const result = await CloseOnlineDailyZReportService(
    "2026-08-24T18:59:00.000Z",
  );

  assert.equal(reportUpdates.length, 2);
  assert.equal(
    cashboxFindOptions.where.system_key,
    ONLINE_PAYMENTS_CASHBOX_KEY,
  );
  assert.equal(cashboxFindOptions.where.type, CashboxTypes.VIRTUAL);

  const activeReportUpdate = reportUpdates[0];
  assert.equal(
    activeReportUpdate.values.status,
    CashboxReportStatusTypes.CONFIRMED,
  );
  assert.equal(activeReportUpdate.values.operator, null);
  assert.equal(activeReportUpdate.values.checked_by, null);
  assert.ok(activeReportUpdate.values.closed_at instanceof Date);
  assert.deepEqual(activeReportUpdate.options.where.status[Op.in], [
    CashboxReportStatusTypes.OPEN,
    CashboxReportStatusTypes.STOPPED,
  ]);

  const legacyReportUpdate = reportUpdates[1];
  assert.equal(
    legacyReportUpdate.values.status,
    CashboxReportStatusTypes.CONFIRMED,
  );
  assert.equal(legacyReportUpdate.values.operator, null);
  assert.equal(legacyReportUpdate.values.checked_by, null);
  assert.equal("closed_at" in legacyReportUpdate.values, false);
  assert.equal(
    legacyReportUpdate.options.where.status,
    CashboxReportStatusTypes.CLOSED,
  );

  assert.equal(cashboxUpdate?.values.status, CashboxStatusTypes.INACTIVE);
  assert.equal(result.cashbox, 77);
  assert.equal(result.closed_zreports, 2);
  assert.equal(result.reconciled_cashboxes, 1);
});

test("stale online Z-reports are recovered directly as confirmed", async (t) => {
  let staleReportUpdate: { values: any; options: any } | undefined;
  const currentReport = {
    id: 91,
    status: CashboxReportStatusTypes.OPEN,
  } as any;

  t.mock.method(CashboxModel, "findOne", async () => ({ id: 77 }) as any);
  t.mock.method(
    CashboxReportModel,
    "update",
    async (values: any, options: any) => {
      staleReportUpdate = { values, options };
      return [1] as any;
    },
  );
  t.mock.method(CashboxReportModel, "findOne", async () => currentReport);
  t.mock.method(CashboxModel, "update", async () => [0] as any);

  const result = await GetOrCreateOnlineDailyZReportService(
    transaction,
    "2026-08-25T00:00:00.000Z",
  );

  assert.equal(
    staleReportUpdate?.values.status,
    CashboxReportStatusTypes.CONFIRMED,
  );
  assert.equal(staleReportUpdate?.values.operator, null);
  assert.equal(staleReportUpdate?.values.checked_by, null);
  assert.ok(staleReportUpdate?.values.closed_at instanceof Date);
  assert.ok(staleReportUpdate?.options.where.report_date[Op.lt] instanceof Date);
  assert.equal(result.report, currentReport);
});
