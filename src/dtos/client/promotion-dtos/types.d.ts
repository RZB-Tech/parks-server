declare interface ClientPromotionAttractionResponseDTO {
  id: number;
  name: string;
  size: number;
  pricing_type: "single" | "tariff";
  original_price: number | null;
  discounted_price: number | null;
  tariffs: Array<{
    id: number;
    name: string;
    original_price: number;
    discounted_price: number;
    sort_order: number;
  }>;
  sort_order: number;
}

declare interface ClientPromotionResponseDTO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: PromotionTypes;
  status: PromotionStatusTypes;
  discount_percent: number;
  schedule:
    | {
        starts_at: Date | null;
        ends_at: Date | null;
        start_date: string | null;
        end_date: string | null;
        start_time: string | null;
        end_time: string | null;
      }
    | {
        start_time: string | null;
        end_time: string | null;
        weekdays: number[];
      };
  file: number | null;
  attractions: ClientPromotionAttractionResponseDTO[];
}
