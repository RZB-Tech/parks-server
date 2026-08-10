declare interface AttractionPnlAggregationRow {
  attraction_id: string;
  month: string;
  total: string;
}

declare interface AttractionPnlSourceAttraction {
  id: number;
  name: string;
}

declare interface AttractionPnlMonthResponseDTO {
  month: string;
  total: number;
}

declare interface AttractionPnlAttractionResponseDTO {
  id: number;
  name: string;
  months: AttractionPnlMonthResponseDTO[];
  total: number;
}

declare interface AttractionPnlResponseDTO {
  start_month: string;
  end_month: string;
  months: string[];
  attractions: AttractionPnlAttractionResponseDTO[];
  totals: AttractionPnlMonthResponseDTO[];
  grand_total: number;
}

declare interface AttractionPnlDTOData {
  start_month: string;
  end_month: string;
  months: string[];
  attractions: AttractionPnlSourceAttraction[];
  rows: AttractionPnlAggregationRow[];
}
