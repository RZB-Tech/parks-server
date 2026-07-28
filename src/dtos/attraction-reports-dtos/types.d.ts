/*
|--------------------------------------------------------------------------
| ATTRACTION REPORT OPERATOR TYPES
|--------------------------------------------------------------------------
*/

declare interface AttractionReportOperatorPlain {
  id: number | string;

  firstname: string;
  lastname: string;

  file: number | string | null;
}

declare interface AttractionReportOperatorResponseDTO {
  id: number;

  firstname: string;
  lastname: string;

  file: number | null;
}

/*
|--------------------------------------------------------------------------
| ATTRACTION REPORT PLAIN TYPE
|--------------------------------------------------------------------------
*/

declare type AttractionReportWithOperatorPlain = AttractionReportModelI & {
  operators?: AttractionReportOperatorPlain | null;

  promotion_reports?: PromotionReportPlain[];

  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
};

/*
|--------------------------------------------------------------------------
| ATTRACTION REPORT RESPONSE
|--------------------------------------------------------------------------
*/

declare interface AttractionReportResponseDTO {
  id: number;
  attraction: number;

  operator: number | AttractionReportOperatorResponseDTO | null;

  report_type: AttractionReportTypes;
  zreport: number | null;

  status: AttractionReportStatusTypes;

  opened_at: Date;
  stopped_at: Date | null;
  closed_at: Date | null;

  confirmed_at: Date | null;
  confirmed_by: number | null;

  total_rounds: number;
  total_people: number;

  total_offline: number;
  total_online: number;

  total_virtual: number;
  total_classic: number;

  total_vip: number;
  total_organization: number;

  paid_amount: number;
  total_amount: number;

  promotion_reports: PromotionReportResponseDTO[];

  created_at?: Date;
}

declare interface AttractionReportsTodayDto {
  zreport: AttractionReportResponseDTO | null;

  xreports: AttractionReportResponseDTO[];
}

/*
|--------------------------------------------------------------------------
| ATTRACTION ZREPORT TOTALS
|--------------------------------------------------------------------------
*/

declare interface AttractionZReportTotalsDTO {
  total_rounds: number;
  total_people: number;

  total_offline: number;
  total_online: number;

  total_virtual: number;
  total_classic: number;

  total_vip: number;
  total_organization: number;

  paid_amount: number;
  total_amount: number;
}

/*
|--------------------------------------------------------------------------
| PROMOTION REPORT TOTALS
|--------------------------------------------------------------------------
*/

declare interface PromotionReportTotalsDTO {
  rounds_count: number;
  total_people: number;

  total_virtual: number;
  total_classic: number;

  total_vip: number;
  total_organization: number;

  total_online: number;
  total_offline: number;

  original_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
}

declare type AttractionWithZReportsPlain = AttractionModelI & {
  reports?: AttractionReportWithOperatorPlain[];
};

declare interface AttractionZReportAttractionResponseDTO {
  id: number;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | null;
  main_file: number | null;

  files: number[];

  price: number;
  duration: number;
  seats: number;

  age_limit: number;
  min_height: number;
  max_weight: number;

  description: string | null;

  zreports: Array<Omit<AttractionReportResponseDTO, "promotion_reports">>;

  promotion_reports: PromotionReportResponseDTO[];

  total_reports: AttractionZReportTotalsDTO;
}

declare interface AccountingAttractionDTO {
  id: number;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | null;
  main_file: number | null;

  files: number[];

  price: number;
  duration: number;
  seats: number;

  age_limit: number;
  min_height: number;
  max_weight: number;

  description: string | null;
}

declare interface AccountingAttractionReportDTO {
  attraction: AccountingAttractionDTO;
  zreport: AttractionZReportTotalsDTO;
  promotion_totals: PromotionReportTotalsDTO;
  promotion_reports: PromotionReportResponseDTO[];
}

declare interface AccountingAttractionReportsResponseDTO {
  start_date: Date;
  end_date: Date;
  promotion_code: string | null;
  totals: AttractionZReportTotalsDTO;
  promotion_totals: PromotionReportTotalsDTO;
  attractions: AccountingAttractionReportDTO[];
}

declare interface GetAccountingAttractionReportsQuery {
  date?: string;
  start_date?: string;
  end_date?: string;
  promotion_code?: string;
}
