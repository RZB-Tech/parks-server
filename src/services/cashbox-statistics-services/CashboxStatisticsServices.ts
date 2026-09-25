import { Op } from "sequelize";
import { BadRequest } from "../../exceptions";
import { CardTransactionModel } from "../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";
import { CashboxReportModel } from "../../models/postgresql/cashbox-report-model/CashboxReportModel";
import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { getAccountingDateRange, getTashkentDateOnly } from "../../utils/date";

type StatisticsDateRange = {
  start: Date;
  end: Date;
};

type StatisticsFilter = {
  date: string | null;
  from: string;
  to: string;
  sort: "asc" | "desc";
  timezone: "Asia/Tashkent";
};

type AmountTotals = {
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  online_amount: number;
  uzcard_amount: number;
  humo_amount: number;
  oneqr_amount: number;
  uzum_amount: number;
  payme_amount: number;
  click_amount: number;
};

const amountFields: Array<keyof AmountTotals> = [
  "total_amount",
  "cash_amount",
  "card_amount",
  "online_amount",
  "uzcard_amount",
  "humo_amount",
  "oneqr_amount",
  "uzum_amount",
  "payme_amount",
  "click_amount",
];

const emptyAmountTotals = (): AmountTotals => ({
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
});

const roundPercentage = (amount: number, total: number) => {
  if (total <= 0) return 0;

  return Number(((amount / total) * 100).toFixed(2));
};

const amountWithPercentage = (amount: number, total: number) => ({
  amount,
  percentage: roundPercentage(amount, total),
});

const getSortOrder = (query: GetCashboxStatisticsQuery): "asc" | "desc" => {
  if (!query.sort) return "desc";

  if (query.sort !== "asc" && query.sort !== "desc") {
    throw BadRequest("sort must be asc or desc");
  }

  return query.sort;
};

const sortByAmount = <T extends { amount: number }>(
  items: T[],
  sortOrder: "asc" | "desc",
) => {
  return [...items].sort((first, second) => {
    const difference = first.amount - second.amount;

    return sortOrder === "asc" ? difference : -difference;
  });
};

const getDateRange = (
  query: GetCashboxStatisticsQuery,
): StatisticsDateRange => {
  if (query.date && (query.from || query.to)) {
    throw BadRequest("date cannot be used together with from or to");
  }

  const range = getAccountingDateRange({
    date: query.date,
    start_date: query.from,
    end_date: query.to,
  });

  return {
    start: range.start,
    end: range.end,
  };
};

const getFilter = (
  query: GetCashboxStatisticsQuery,
  range: StatisticsDateRange,
  sort: "asc" | "desc",
): StatisticsFilter => {
  const defaultDate = getTashkentDateOnly(range.start);

  if (query.date) {
    return {
      date: query.date,
      from: query.date,
      to: query.date,
      sort,
      timezone: "Asia/Tashkent",
    };
  }

  return {
    date: null,
    from: query.from ?? defaultDate,
    to: query.to ?? defaultDate,
    sort,
    timezone: "Asia/Tashkent",
  };
};

const getConfirmedZReports = async (range: StatisticsDateRange) =>
  CashboxReportModel.findAll({
    where: {
      report_type: CashboxReportTypes.ZREPORT,
      status: CashboxReportStatusTypes.CONFIRMED,
      report_date: {
        [Op.between]: [range.start, range.end],
      },
    },
    order: [
      ["cashbox", "ASC"],
      ["report_date", "ASC"],
    ],
  });

const sumReportAmounts = (reports: CashboxReportModel[]) => {
  const totals = emptyAmountTotals();

  for (const report of reports) {
    for (const field of amountFields) {
      totals[field] += Number(report[field] || 0);
    }
  }

  return totals;
};

export const GetCashboxTurnoverStatisticsService = async (
  query: GetCashboxStatisticsQuery,
) => {
  const range = getDateRange(query);
  const sort = getSortOrder(query);
  const [cashboxes, reports] = await Promise.all([
    CashboxModel.findAll({ order: [["id", "ASC"]] }),
    getConfirmedZReports(range),
  ]);

  const totalAmount = reports.reduce(
    (total, report) => total + Number(report.total_amount || 0),
    0,
  );

  const reportsByCashbox = new Map<number, CashboxReportModel[]>();

  for (const report of reports) {
    const cashboxID = Number(report.cashbox);
    const cashboxReports = reportsByCashbox.get(cashboxID) ?? [];
    cashboxReports.push(report);
    reportsByCashbox.set(cashboxID, cashboxReports);
  }

  const cashboxStatistics = cashboxes.map((cashbox) => {
    const cashboxReports = reportsByCashbox.get(Number(cashbox.id)) ?? [];
    const amount = cashboxReports.reduce(
      (total, report) => total + Number(report.total_amount || 0),
      0,
    );

    return {
      cashbox_id: Number(cashbox.id),
      cashbox_name: cashbox.name,
      amount,
      percentage: roundPercentage(amount, totalAmount),
      report_count: cashboxReports.length,
    };
  });

  return {
    filter: getFilter(query, range, sort),
    total_amount: totalAmount,
    cashboxes: sortByAmount(cashboxStatistics, sort),
  };
};

const getNfcAmount = async (reports: CashboxReportModel[]) => {
  const zReportIDs = reports.map((report) => Number(report.id));

  if (zReportIDs.length === 0) return 0;

  const xReports = await CashboxReportModel.findAll({
    where: {
      report_type: CashboxReportTypes.XREPORT,
      zreport: {
        [Op.in]: zReportIDs,
      },
    },
    attributes: ["id"],
  });

  const xReportIDs = xReports.map((report) => Number(report.id));

  if (xReportIDs.length === 0) return 0;

  const transactions = await CardTransactionModel.findAll({
    where: {
      cashbox_report: {
        [Op.in]: xReportIDs,
      },
      type: CardTransactionType.TOPUP,
      status: CardTransactionStatusTypes.SUCCESS,
      payment_type: PaymentType.CARD,
      payment_card_type: PaymentCardType.NFC,
    },
    attributes: ["amount", "activation_amount"],
  });

  return transactions.reduce(
    (total, transaction) =>
      total +
      Number(transaction.amount || 0) +
      Number(transaction.activation_amount || 0),
    0,
  );
};

export const GetPaymentMethodsStatisticsService = async (
  query: GetCashboxStatisticsQuery,
) => {
  const range = getDateRange(query);
  const sort = getSortOrder(query);
  const reports = await getConfirmedZReports(range);
  const totals = sumReportAmounts(reports);
  const nfcAmount = await getNfcAmount(reports);

  const byPaymentType = [
    {
      type: PaymentType.CASH,
      ...amountWithPercentage(totals.cash_amount, totals.total_amount),
    },
    {
      type: PaymentType.CARD,
      ...amountWithPercentage(totals.card_amount, totals.total_amount),
    },
    {
      type: PaymentType.ONLINE,
      ...amountWithPercentage(totals.online_amount, totals.total_amount),
    },
  ];

  const byCardType = [
    {
      type: PaymentCardType.UZCARD,
      ...amountWithPercentage(totals.uzcard_amount, totals.total_amount),
    },
    {
      type: PaymentCardType.HUMO,
      ...amountWithPercentage(totals.humo_amount, totals.total_amount),
    },
    {
      type: PaymentCardType.NFC,
      ...amountWithPercentage(nfcAmount, totals.total_amount),
    },
  ];

  const byOnlineService = [
    {
      type: "oneqr",
      ...amountWithPercentage(totals.oneqr_amount, totals.total_amount),
    },
    {
      type: "uzum",
      ...amountWithPercentage(totals.uzum_amount, totals.total_amount),
    },
    {
      type: "payme",
      ...amountWithPercentage(totals.payme_amount, totals.total_amount),
    },
    {
      type: "click",
      ...amountWithPercentage(totals.click_amount, totals.total_amount),
    },
  ];

  return {
    filter: getFilter(query, range, sort),
    total_amount: totals.total_amount,
    by_payment_type: sortByAmount(byPaymentType, sort),
    by_card_type: sortByAmount(byCardType, sort),
    by_online_service: sortByAmount(byOnlineService, sort),
  };
};
