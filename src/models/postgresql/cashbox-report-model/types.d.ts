declare interface CashboxReportModelI {
  id: number;
  operator: number | null;
  cashbox: number;
  checked_by: number | null;
  report_type: import("./enums").CashboxReportTypes;
  zreport: number | null;
  report_date: Date;
  status: import("./enums").CashboxReportStatusTypes;
  opened_at: Date;
  closed_at: Date | null;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  online_amount: number;
  uzcard_amount: number;
  humo_amount: number;
  uzum_amount: number;
  payme_amount: number;
  click_amount: number;
  activated_cards_count: number;
  relationed_cards_count: number;
  transactions_count: number;
  xreports_count: number | null;
  created_at?: Date
}
