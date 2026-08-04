declare interface ClientAttractionResponseDTO {
  id: number;

  name: string;
  status: AttractionStatusTypes;

  dashboard_file: number | null;
  main_file: number | null;
  files: Array<number>;
  sub_attraction_files: Array<number> | null;
  size: number;

  latitude: string | null;
  longitude: string | null;

  pricing_type: "single" | "tariff";
  original_price: number | null;
  price: number | null;
  discount_percent: number;
  tariffs: ClientAttractionTariffDTO[];
  duration: number;
  seats: number;

  age_limit: number | null;
  min_height: number | null;
  max_weight: number | null;

  description: string | null;
}

declare interface ClientAttractionDetailsResponseDTO
  extends ClientAttractionResponseDTO {
  promotion: {
    id: number;
    code: string;
    name: string;
    type: PromotionTypes;
    discount_percent: number;
    original_price: number | null;
    discounted_price: number | null;
    started_at: Date;
    ended_at: Date;
  } | null;
}

declare interface AttractionLastRoundResponseDTO {
  id: number;
  name: string;
  pricing_type: "single" | "tariff";
  original_price: number | null;
  price: number | null;
  discount_percent: number;
  tariffs: ClientAttractionTariffDTO[];
  promotion: {
    id: number;
    code: string;
    name: string;
    type: PromotionTypes;
    discount_percent: number;
    original_price: number | null;
    discounted_price: number | null;
    started_at: Date;
    ended_at: Date;
  } | null;
  main_file: number | null;
  size: number;
  seats: number;

  round: {
    id: number;
    round_number: number;
    status: AttractionRoundStatusTypes;
    total_seats: number;
    occupied_seats: number;
    available_seats: number;
  } | null;

  available_seats: number;
}

declare interface ClientAttractionTariffDTO {
  id: number;
  name: string;
  original_price: number;
  price: number;
  discount_percent: number;
  sort_order: number;
}
