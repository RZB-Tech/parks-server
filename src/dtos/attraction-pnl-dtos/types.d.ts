declare interface AttractionPnlAggregationRow {
  attraction_id: string;
  month: string;
  total: string;
  rounds_count: string;
  people_count: string;
  virtual_count: string;
  classic_count: string;
  vip_count: string;
  organization_count: string;
}

declare interface AttractionPnlSourceAttraction {
  id: number;
  name: string;
  price: number | null;
}

declare interface AttractionPnlCounts {
  rounds_count: number;
  people_count: number;
  virtual_count: number;
  classic_count: number;
  vip_count: number;
  organization_count: number;
}

declare interface AttractionPnlMetrics extends AttractionPnlCounts {
  total: number;
}

declare interface AttractionPnlMonthResponseDTO extends AttractionPnlMetrics {
  month: string;
}

declare interface AttractionPnlAttractionResponseDTO extends AttractionPnlMetrics {
  id: number;
  name: string;
  price: number | null;
  months: AttractionPnlMonthResponseDTO[];
}

declare interface AttractionPnlResponseDTO extends AttractionPnlCounts {
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
