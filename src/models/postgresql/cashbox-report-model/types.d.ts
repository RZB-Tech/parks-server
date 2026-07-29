declare interface CashboxReportModelI {
  id: number;
  operator: number | null;
  cashbox: number;
  checked_by: number | null;
  report_type: import("./enums").CashboxReportTypes;
  zreport: number | null;
  report_date: Date;
  status: import("./enums").CashboxReportStatusTypes;
  description: string | null;
  opened_at: Date;
  stopped_at: Date | null;
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
  refunded_amount: number;
  refund_transactions_count: number;
  payme_refunded_amount: number;
  uzum_refunded_amount: number;
  click_refunded_amount: number;
  activated_cards_count: number;
  activated_cards_amount: number;
  returned_cards_count: number;
  returned_cards_amount: number;
  relationed_cards_count: number;
  transactions_count: number;
  xreports_count: number | null;
  created_at?: Date
}
