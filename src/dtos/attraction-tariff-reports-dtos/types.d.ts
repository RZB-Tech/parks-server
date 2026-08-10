declare interface AttractionTariffReportPlain {
  attraction_tariff: number | string;
  tariff_name: string;

  promotion: number | string | null;
  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  discount_percent: number | string;

  original_unit_price: number | string;
  sale_unit_price: number | string;

  rounds_count: number | string;
  total_people: number | string;
  refund_count: number | string;

  total_virtual: number | string;
  total_classic: number | string;
  total_vip: number | string;
  total_organization: number | string;

  total_online: number | string;
  total_offline: number | string;

  original_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
}

declare interface AttractionTariffReportResponseDTO {
  attraction_tariff: number;
  tariff_name: string;

  promotion: number | null;
  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  discount_percent: number;

  original_unit_price: number;
  sale_unit_price: number;

  rounds_count: number;
  total_people: number;
  refund_count: number;

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
