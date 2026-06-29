import { CashboxReportTypes } from "../../models/postgresql/cashbox-report-model/enums";

declare interface CashboxReportOperatorDTO {
  id: number;
  firstname: string;
  lastname: string;
  file: number | null;
}

declare type CashboxReportOperatorPlain = Pick<
  EmployeeModelI,
  "id" | "firstname" | "lastname" | "file"
>;

declare interface CashboxReportResponseDTO extends Omit<
  CashboxReportModelI,
  "operator"
> {
  operator: CashboxReportOperatorDTO | null;
}

type ZReportCashboxPlain = {
  id: number;
  name: string;
};

declare type CashboxReportWithOperatorPlain = CashboxReportModelI & {
  operators?: CashboxReportOperatorPlain | null;
};

declare type CashboxWithZReportsPlain = CashboxModelI & {
  reports?: CashboxReportWithOperatorPlain[];
};

export interface AccountingCashboxDTO {
  id: number;
  name: string;
  place: string;
  status: CashboxModelI["status"];
  description: string | null;
}

export interface AccountingZReportAmountDTO {
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
  xreports_count: number;
}

export interface AccountingCashboxReportDTO {
  cashbox: AccountingCashboxDTO;
  zreport: AccountingZReportAmountDTO;
}

export interface AccountingCashboxReportsResponseDTO {
  start_date: Date;
  end_date: Date;
  totals: AccountingZReportAmountDTO;
  cashboxes: AccountingCashboxReportDTO[];
}