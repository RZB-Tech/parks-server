import {
  AccountingCashboxReportDTO,
  AccountingZReportAmountDTO,
  CashboxReportOperatorPlain,
  CashboxReportResponseDTO,
  CashboxReportWithOperatorPlain,
  CashboxWithZReportsPlain,
  ZReportCashboxPlain,
} from "./types";
import { CashboxTypes } from "../../models/postgresql/cashbox-model/enums";
import { getTashkentDateOnly } from "../../utils/date";

const reportDateDTO = (data: CashboxReportWithOperatorPlain, dateOnly: boolean) =>
  dateOnly ? getTashkentDateOnly(data.report_date) : data.report_date;

export const CashboxXReportDTO = (
  data: CashboxReportWithOperatorPlain,
  dateOnly = false,
): CashboxReportResponseDTO => {
  return {
    id: Number(data.id),
    operator: CashboxReportOperatorDTO(data.operators ?? null),
    cashbox: Number(data.cashbox),
    checked_by: data.checked_by !== null ? Number(data.checked_by) : null,
    report_type: data.report_type,
    zreport: data.zreport !== null ? Number(data.zreport) : null,
    report_date: reportDateDTO(data, dateOnly),
    status: data.status,
    description: data.description ?? null,
    opened_at: data.opened_at,
    stopped_at: data.stopped_at ?? null,
    closed_at: data.closed_at ?? null,
    total_amount: Number(data.total_amount || 0),
    cash_amount: Number(data.cash_amount || 0),
    card_amount: Number(data.card_amount || 0),
    online_amount: Number(data.online_amount || 0),
    uzcard_amount: Number(data.uzcard_amount || 0),
    humo_amount: Number(data.humo_amount || 0),
    oneqr_amount: Number(data.oneqr_amount || 0),
    uzum_amount: Number(data.uzum_amount || 0),
    payme_amount: Number(data.payme_amount || 0),
    click_amount: Number(data.click_amount || 0),
    activated_cards_count: Number(data.activated_cards_count || 0),
    activated_cards_amount: Number(data.activated_cards_amount || 0),
    returned_cards_count: Number(data.returned_cards_count || 0),
    relationed_cards_count: Number(data.relationed_cards_count || 0),
    xreports_count:
      data.xreports_count !== null ? Number(data.xreports_count) : null,
  };
};

export const CashboxReportsTodayDTO = (data: {
  zreport: CashboxReportModelI | null;
  xreports: CashboxReportModelI[];
  date_only?: boolean;
}) => {
  return {
    zreport: data.zreport
      ? CashboxXReportDTO(data.zreport, data.date_only)
      : null,
    xreports: data.xreports.map((report) =>
      CashboxXReportDTO(report, data.date_only),
    ),
  };
};

export const CashboxReportOperatorDTO = (
  data: CashboxReportOperatorPlain | null,
) => {
  if (!data) return null;

  return {
    id: Number(data.id),
    firstname: data.firstname,
    lastname: data.lastname,
    file:
      data.file !== null && data.file !== undefined ? Number(data.file) : null,
  };
};

export const ZReportCashboxWithReportsDTO = (data: CashboxWithZReportsPlain) => {
  const dateOnly = data.type === CashboxTypes.VIRTUAL;

  return {
    id: Number(data.id),
    name: data.name,
    place: data.place,
    status: data.status,
    description: data.description,

    zreports: Array.isArray(data.reports)
      ? data.reports.map((report) => ZReportDTO(report, dateOnly))
      : [],
  };
};

export const ZReportDTO = (
  data: CashboxReportWithOperatorPlain,
  dateOnly = false,
) => {
  return {
    id: Number(data.id),
    description: data.description,
    operator: CashboxReportOperatorDTO(data.operators ?? null),
    checked_by: data.checked_by !== null ? Number(data.checked_by) : null,
    report_type: data.report_type,
    zreport: data.zreport !== null ? Number(data.zreport) : null,
    report_date: reportDateDTO(data, dateOnly),
    status: data.status,
    opened_at: data.opened_at,
    closed_at: data.closed_at ?? null,
    total_amount: Number(data.total_amount || 0),
    cash_amount: Number(data.cash_amount || 0),
    card_amount: Number(data.card_amount || 0),
    online_amount: Number(data.online_amount || 0),
    uzcard_amount: Number(data.uzcard_amount || 0),
    humo_amount: Number(data.humo_amount || 0),
    oneqr_amount: Number(data.oneqr_amount || 0),
    uzum_amount: Number(data.uzum_amount || 0),
    payme_amount: Number(data.payme_amount || 0),
    click_amount: Number(data.click_amount || 0),
    activated_cards_count: Number(data.activated_cards_count || 0),
    activated_cards_amount: Number(data.activated_cards_amount || 0),
    returned_cards_count: Number(data.returned_cards_count || 0),
    relationed_cards_count: Number(data.relationed_cards_count || 0),
    xreports_count:
      data.xreports_count !== null ? Number(data.xreports_count) : null,
    created_at: data.created_at,
  };
};

export const emptyAccountingZReport = (): AccountingZReportAmountDTO => {
  return {
    total_amount: 0,
    cash_amount: 0,
    card_amount: 0,
    online_amount: 0,

    uzcard_amount: 0,
    humo_amount: 0,
    oneqr_amount: 0,
    uzum_amount: 0,
    payme_amount: 0,
    click_amount: 0,

    activated_cards_count: 0,
    activated_cards_amount: 0,
    returned_cards_count: 0,
    relationed_cards_count: 0,
    xreports_count: 0,
  };
};

export const addAccountingZReportAmount = (
  target: AccountingZReportAmountDTO,
  report: CashboxReportModelI,
) => {
  target.total_amount += Number(report.total_amount || 0);
  target.cash_amount += Number(report.cash_amount || 0);
  target.card_amount += Number(report.card_amount || 0);
  target.online_amount += Number(report.online_amount || 0);

  target.uzcard_amount += Number(report.uzcard_amount || 0);
  target.humo_amount += Number(report.humo_amount || 0);
  target.oneqr_amount += Number(report.oneqr_amount || 0);
  target.uzum_amount += Number(report.uzum_amount || 0);
  target.payme_amount += Number(report.payme_amount || 0);
  target.click_amount += Number(report.click_amount || 0);

  target.activated_cards_count += Number(report.activated_cards_count || 0);
  target.activated_cards_amount += Number(
    report.activated_cards_amount || 0,
  );
  target.returned_cards_count += Number(report.returned_cards_count || 0);
  target.relationed_cards_count += Number(report.relationed_cards_count || 0);
  target.xreports_count += Number(report.xreports_count || 0);
};

export const AccountingCashboxReportsDTO = (data: {
  start_date: Date;
  end_date: Date;
  cashboxes: CashboxModelI[];
  reports: CashboxReportModelI[];
}) => {
  const totals = emptyAccountingZReport();

  const cashboxes: AccountingCashboxReportDTO[] = data.cashboxes.map(
    (cashbox) => {
      const zreport = emptyAccountingZReport();

      const reports = data.reports.filter(
        (report) => Number(report.cashbox) === Number(cashbox.id),
      );

      for (const report of reports) {
        addAccountingZReportAmount(zreport, report);
        addAccountingZReportAmount(totals, report);
      }

      return {
        cashbox: {
          id: Number(cashbox.id),
          name: cashbox.name,
          place: cashbox.place,
          status: cashbox.status,
          description: cashbox.description ?? null,
          type: cashbox.type,
        },
        zreport,
      };
    },
  );

  return {
    start_date: data.start_date,
    end_date: data.end_date,
    totals,
    cashboxes,
  };
};
