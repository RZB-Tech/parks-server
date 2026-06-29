declare interface CashboxReportsParams {
  cashboxID: number;
}

declare interface CloseCashboxReportData {
  report_type: import("./enums").CashboxReportTypes;
}

declare interface GetZReportsQuery {
  date?: string;
  status?: CashboxReportStatusTypes;
  page?: number;
  limit?: number;
}

type StatusCountRow = {
  status: CashboxReportStatusTypes;
  count: string | number;
};

declare interface ConfirmZReportItemData {
  id: number;
  status:
    | CashboxReportStatusTypes.CONFIRMED
    | CashboxReportStatusTypes.CANCELLED;
}

declare interface ConfirmZReportsData {
  zreports: ConfirmZReportItemData[];
}

declare interface GetAccountingCashboxReportsQuery {
  date?: string;
  start_date?: string;
  end_date?: string;
}