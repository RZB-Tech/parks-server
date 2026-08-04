declare interface AttractionRoundParams {
  attractionID: number;
  roundID: number;
}

declare interface RefundAttractionRoundData {
  card_id: number;
  transactionIDs: number[];
  description: string;
}

declare interface GetAttractionRoundRefundsQuery {
  attractionID?: number;
  card_number?: string;
  date?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}
