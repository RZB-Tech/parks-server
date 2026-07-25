declare interface ClientAttractionResponseDTO {
  id: number;

  name: string;
  status: AttractionStatusTypes;

  dashboard_file: number | null;
  main_file: number | null;
  files: Array<number>;
  sub_attraction_files: Array<number> | null;

  latitude: string | null;
  longitude: string | null;

  original_price: number;
  price: number;
  discount_percent: number;
  duration: number;
  seats: number;

  age_limit: number | null;
  min_height: number | null;
  max_weight: number | null;

  description: string | null;
}

declare interface AttractionLastRoundResponseDTO {
  id: number;
  name: string;
  original_price: number;
  price: number;
  discount_percent: number;
  main_file: number | null;
  seats: number;

  round: {
    id: number;
    round_number: number;
    total_seats: number;
    occupied_seats: number;
    available_seats: number;
  } | null;

  available_seats: number;
}
