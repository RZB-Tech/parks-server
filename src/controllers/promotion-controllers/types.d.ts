import { PromotionTypes } from "../../models/promotion-models/enums";

export interface CreatePromotionData {
  name: string;
  description?: string | null;
  code: string;

  type: PromotionTypes;

  discount_percent: number;

  start_date: string;
  start_time: string;

  end_date: string;
  end_time: string;

  /*
   * Regular aksiya uchun.
   * Yuborilmasa barcha kun ishlaydi.
   */
  weekdays?: number[];
  attractions: number[];
  file?: number | null;
}
