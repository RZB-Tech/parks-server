declare interface AttractionRoundParams {
  attractionID: number;
  roundID: number;
}

declare interface GetTodayRoundsQuery {
  date?: string;
  attractionID?: number;
  card_number?: string;
}
