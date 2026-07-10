declare interface AttractionReportDto {
  id: number;
  attraction: number;
  operator: number;
  status: AttractionReportStatusTypes;
  opened_at: Date;
  closed_at: Date | null;
  total_rounds: number;
  total_people: number;
  paid_amount: number;
  total_amount: number;
  created_at?: Date;
}

declare interface PaymentAttractionPlain {
  id: number | string;
  name: string;
  price: number | string;
  seats: number | string;
}

declare interface PaymentOperatorAttractionData extends AttractionOperatorModelI {
  attractions: PaymentAttractionPlain;
}

declare type AttractionReportOperatorDTO = {
  id: number;
  firstname: string;
  lastname: string;
  file: number | null;
};

declare type AttractionReportWithOperatorPlain = AttractionReportModelI & {
  operators?: AttractionReportOperatorDTO | null;
};

declare type AttractionReportDto = {
  id: number;
  attraction: number;
  operator: number | AttractionReportOperatorDTOType | null;

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
  total_vip: number;
  total_guest: number;
  total_park_staff: number;

  paid_amount: number;
  total_amount: number;

  created_at: Date;
};

declare type AttractionReportsTodayDto = {
  zreport: AttractionReportDto | null;
  xreports: AttractionReportDto[];
};

declare interface AttractionZReportTotalsDTO {
  total_rounds: number;
  total_people: number;

  total_offline: number;
  total_online: number;
  total_vip: number;
  total_guest: number;
  total_park_staff: number;

  paid_amount: number;
  total_amount: number;
}

declare type AttractionWithZReportsPlain = AttractionModelI & {
  reports?: AttractionReportWithOperatorPlain[];
};

declare type AccountingAttractionReportDTO = {
  attraction: {
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
  };
  zreport: AttractionZReportTotalsDTO;
};


declare type AccountingAttractionReportsResponseDTO = {
  start_date: Date;
  end_date: Date;
  totals: AttractionZReportTotalsDTO;
  attractions: AccountingAttractionReportDTO[];
};