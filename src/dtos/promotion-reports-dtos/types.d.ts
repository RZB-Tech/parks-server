declare interface ActivePromotionForAttractionDTO {
  id: number;

  code: string;
  name: string;
  type: PromotionTypes;

  discount_percent: number;

  original_price: number;
  discounted_price: number;

  promotion_started_at: Date;
  promotion_ended_at: Date;
}

declare interface UpsertPromotionReportData {
  attraction: number;

  xreport: number;
  zreport: number;

  promotion: number | null;

  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  promotion_started_at: Date;
  promotion_ended_at: Date;

  discount_percent: number;

  original_unit_price: number;
  sale_unit_price: number;

  people_count: number;

  total_virtual: number;
  total_classic: number;
  total_vip: number;
  total_organization: number;

  total_online: number;
  total_offline: number;

  original_amount: number;
  discount_amount: number;
  paid_amount: number;
}

declare interface PromotionReportPlain {
  id?: number | string;

  report_date?: string;

  attraction?: number | string;
  xreport?: number | string;
  zreport?: number | string;

  promotion: number | string | null;
  promotion_key: string;

  promotion_started_at: Date | null;
  promotion_ended_at: Date;

  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  discount_percent: number | string;

  original_unit_price: number | string;
  sale_unit_price: number | string;

  transactions_count: number | string;
  total_people: number | string;

  total_virtual: number | string;
  total_classic: number | string;
  total_vip: number | string;
  total_organization: number | string;

  total_online: number | string;
  total_offline: number | string;

  original_amount: number | string;
  discount_amount: number | string;
  paid_amount: number | string;

  createdAt?: Date;
  updatedAt?: Date;

  created_at?: Date;
  updated_at?: Date;
}
