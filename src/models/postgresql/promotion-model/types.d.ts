declare interface PromotionModelI {
  id: number;

  code: string;
  name: string;
  description: string | null;

  type: import("../../models/promotion-models/enums").PromotionTypes;
  status: import("../../models/promotion-models/enums").PromotionStatusTypes;

  discount_percent: number;

  /*
   * ONE_TIME uchun
   */
  starts_at: Date | null;
  ends_at: Date | null;

  /*
   * REGULAR uchun
   */
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  weekdays: number[] | null;

  file: number | null;
}
