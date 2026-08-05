declare interface PromotionReportModelI {
  id: number;

  report_date: string;

  attraction: number;
  xreport: number;
  zreport: number;

  promotion: number | null;
  promotion_key: string;

  promotion_code: string | null;
  promotion_name: string | null;
  promotion_type: PromotionTypes | null;

  promotion_started_at: Date | null;
  promotion_ended_at: Date | null;

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

  createdAt?: Date;
  updatedAt?: Date;
}
