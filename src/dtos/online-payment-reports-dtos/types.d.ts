import { CashboxReportStatusTypes } from "../../models/postgresql/cashbox-report-model/enums";

export type OnlinePaymentDailyZReportPlain = Pick<
  CashboxReportModelI,
  | "id"
  | "status"
  | "report_date"
  | "opened_at"
  | "closed_at"
  | "total_amount"
  | "uzum_amount"
  | "click_amount"
  | "payme_amount"
  | "oneqr_amount"
>;

export interface OnlinePaymentDailyReportDTOInput {
  from: string;
  to: string;
  reports: OnlinePaymentDailyZReportPlain[];
  registered_users_count: number;
  virtual_cards_opened_count: number;
  registered_users_with_virtual_card_count: number;
  bonus_per_virtual_card: number;
}

export interface OnlinePaymentDailyReportResponseDTO {
  date: string | null;
  from: string;
  to: string;
  timezone: "Asia/Tashkent";
  z_report: {
    id: number;
    status: CashboxReportStatusTypes;
    opened_at: string;
    closed_at: string | null;
  } | null;
  z_reports: Array<{
    id: number;
    date: string;
    status: CashboxReportStatusTypes;
    opened_at: string;
    closed_at: string | null;
  }>;
  payments: {
    total_amount: number;
    uzum_amount: number;
    click_amount: number;
    payme_amount: number;
    oneqr_amount: number;
  };
  application_stats: {
    registered_users_count: number;
    virtual_cards_opened_count: number;
    registered_users_with_virtual_card_count: number;
    registered_users_without_virtual_card_count: number;
    bonus_per_virtual_card: number;
    total_bonus_amount: number;
  };
}
