import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../src/models/postgresql/cashbox-report-model/enums";
import {
  CashboxStatusTypes,
  CashboxTypes,
} from "../src/models/postgresql/cashbox-model/enums";
import {
  CashboxModel,
  CashboxReportModel,
} from "../src/plugins/db/postgresql/db";
import {
  GetNotConfirmedZReportDatesService,
  GetTodayCashboxReportsService,
  GetZReportsService,
} from "../src/services/cashbox-reports-services/CashboxReportsServices";

const cashboxPlain = (id: number, type: CashboxTypes) => ({
  id,
  name: type === CashboxTypes.VIRTUAL ? "Online" : "Physical",
  place: "Park",
  status: CashboxStatusTypes.ACTIVE,
  type,
  system_key: type === CashboxTypes.VIRTUAL ? "online_payments" : null,
  description: null,
  latitude: null,
  longitude: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
});

const cashboxInstance = (id: number, type: CashboxTypes) => {
  const plain = cashboxPlain(id, type);

  return {
    ...plain,
    get: () => ({ ...plain }),
  } as any;
};

test("Z-report list uses calendar dates for virtual cashboxes only", async (t) => {
  const physicalCashbox = cashboxInstance(10, CashboxTypes.PHYSICAL);
  const virtualCashbox = cashboxInstance(20, CashboxTypes.VIRTUAL);
  let reportFindOptions: any;

  t.mock.method(CashboxModel, "findAll", async () => [
    virtualCashbox,
    physicalCashbox,
  ] as any);
  t.mock.method(CashboxReportModel, "findAll", async (options: any) => {
    reportFindOptions = options;
    return [] as any;
  });

  await GetZReportsService({ date: "2026-09-02" });

  const dateBranches = reportFindOptions.where[Op.or];
  assert.equal(dateBranches.length, 2);
  assert.deepEqual(dateBranches[0].cashbox[Op.in], [20]);
  assert.equal(
    dateBranches[0].report_date[Op.between][0].toISOString(),
    "2026-09-01T19:00:00.000Z",
  );
  assert.equal(
    dateBranches[0].report_date[Op.between][1].toISOString(),
    "2026-09-02T18:59:59.999Z",
  );
  assert.deepEqual(dateBranches[1].cashbox[Op.notIn], [20]);
  assert.equal(
    dateBranches[1].opened_at[Op.gte].toISOString(),
    "2026-09-01T22:00:00.000Z",
  );
  assert.equal(
    dateBranches[1].opened_at[Op.lt].toISOString(),
    "2026-09-02T22:00:00.000Z",
  );
});

test("today endpoint finds a virtual Z-report by report_date", async (t) => {
  let reportFindOptions: any;

  t.mock.method(CashboxModel, "findByPk", async () => ({
    type: CashboxTypes.VIRTUAL,
  }) as any);
  t.mock.method(CashboxReportModel, "findOne", async (options: any) => {
    reportFindOptions = options;
    return null;
  });

  await GetTodayCashboxReportsService(
    1,
    { cashboxID: "20" },
    { date: "2026-09-02" },
  );

  assert.equal("opened_at" in reportFindOptions.where, false);
  assert.equal(
    reportFindOptions.where.report_date[Op.between][0].toISOString(),
    "2026-09-01T19:00:00.000Z",
  );
  assert.equal(
    reportFindOptions.where.report_date[Op.between][1].toISOString(),
    "2026-09-02T18:59:59.999Z",
  );
});

test("virtual cashbox report_date is returned as a Tashkent date", async (t) => {
  const virtualCashbox = cashboxInstance(20, CashboxTypes.VIRTUAL);
  const reportDate = new Date("2026-09-01T19:00:00.000Z");
  const report = {
    id: 30,
    operator: null,
    cashbox: 20,
    checked_by: null,
    report_type: CashboxReportTypes.ZREPORT,
    zreport: null,
    report_date: reportDate,
    status: CashboxReportStatusTypes.OPEN,
    description: null,
    opened_at: reportDate,
    stopped_at: null,
    closed_at: null,
    total_amount: 1000,
    cash_amount: 0,
    card_amount: 0,
    online_amount: 1000,
    uzcard_amount: 0,
    humo_amount: 0,
    oneqr_amount: 0,
    uzum_amount: 0,
    payme_amount: 1000,
    click_amount: 0,
    activated_cards_count: 0,
    activated_cards_amount: 0,
    returned_cards_count: 0,
    relationed_cards_count: 0,
    xreports_count: 0,
    created_at: reportDate,
    updated_at: reportDate,
    deleted_at: null,
    get: () => report,
  } as any;

  t.mock.method(CashboxModel, "findAll", async () => [virtualCashbox] as any);
  t.mock.method(CashboxReportModel, "findAll", async () => [report] as any);

  const result = await GetZReportsService({ date: "2026-09-02" });

  assert.equal(result.cashboxes[0].zreports[0].report_date, "2026-09-02");
});

test("not-confirmed dates use report_date for virtual cashboxes", async (t) => {
  let querySQL = "";
  let queryOptions: any;

  t.mock.method(
    CashboxReportModel.sequelize!,
    "query",
    async (sql: string, options: any) => {
      querySQL = sql;
      queryOptions = options;
      return [] as any;
    },
  );

  await GetNotConfirmedZReportDatesService();

  assert.match(querySQL, /WHEN cashboxes\.type = :virtualCashboxType/);
  assert.match(querySQL, /cashbox_reports\.report_date AT TIME ZONE/);
  assert.equal(
    queryOptions.replacements.virtualCashboxType,
    CashboxTypes.VIRTUAL,
  );
});
