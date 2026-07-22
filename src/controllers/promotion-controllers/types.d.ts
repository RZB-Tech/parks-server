declare interface PromotionParams {
  promotionID: number;
}

declare interface GetPromotionsQuery {
  status?: PromotionStatusTypes;
}

declare interface CreatePromotionData {
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

declare interface UpdatePromotionData {
  name?: string;
  description?: string | null;
  type?: PromotionTypes;
  discount_percent?: number;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  weekdays?: number[];
  attractions?: number[];
  file?: number | null;
  status?: PromotionStatusTypes.ARCHIVED;
}

declare interface DeletePromotionsData {
  promotionIDs: number[];
}
