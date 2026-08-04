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
  tariff_reports?: AttractionTariffReportPlain[];

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

declare type AttractionZReportResponseDTO = Omit<
  AttractionReportResponseDTO,
  "promotion_reports"
> & {
  tariff_reports?: AttractionTariffReportResponseDTO[];
};

declare type AttractionZPromotionReportResponseDTO =
  PromotionReportResponseDTO & {
    tariff_reports: AttractionTariffReportResponseDTO[];
  };

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

declare type AttractionZReportTotalsWithTariffsDTO =
  AttractionZReportTotalsDTO & {
    tariff_reports: AttractionTariffReportResponseDTO[];
  };

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

declare interface AttractionZReportTariffDTO {
  id: number;
  name: string;
  price: number;
  status: import("../../models/postgresql/attraction-tariff-model/enums").AttractionTariffStatusTypes;
  sort_order: number;
}

declare interface AttractionZReportAttractionResponseDTO {
  id: number;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | null;
  main_file: number | null;

  files: number[];

  size: number;
  price: number | null;
  pricing_type?: "single" | "tariff";
  tariffs?: AttractionZReportTariffDTO[];
  duration: number;
  seats: number;

  age_limit: number;
  min_height: number;
  max_weight: number;

  description: string | null;

  zreports: AttractionZReportResponseDTO[];

  promotion_reports: AttractionZPromotionReportResponseDTO[];

  total_reports:
    | AttractionZReportTotalsDTO
    | AttractionZReportTotalsWithTariffsDTO;
}

declare interface AccountingAttractionDTO {
  id: number;

  name: string;
  manufacturer: string | null;

  status: string;

  dashboard_file: number | null;
  main_file: number | null;

  files: number[];

  size: number;
  price: number | null;
  duration: number;
  seats: number;

  age_limit: number;
  min_height: number;
  max_weight: number;

  description: string | null;
}

declare interface AccountingAttractionReportsResponseDTO {
  start_date: Date;
  end_date: Date;
  promotion_code: string | null;
  promotion_codes: string[];
  stats: {
    total: number;
    open: number;
    stopped: number;
    waiting: number;
    confirmed: number;
  };
  totals: AttractionZReportTotalsDTO;
  attractions: AttractionZReportAttractionResponseDTO[];
}

declare interface GetAccountingAttractionReportsQuery {
  date?: string;
  start_date?: string;
  end_date?: string;
  promotion_code?: string;
  promotion_codes?: string[] | string;
}
