import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";

export const PromotionDTO = (promotion: PromotionModel) => {
  const data = promotion.toJSON() as any;

  return {
    id: Number(data.id),

    code: data.code,
    name: data.name,
    description: data.description,

    type: data.type,
    status: data.status,

    discount_percent: Number(data.discount_percent),

    schedule:
      data.type === "one_time"
        ? {
            start_date: data.start_date,
            end_date: data.end_date,
            start_time: data.start_time,
            end_time: data.end_time,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
          }
        : {
            start_time: data.start_time,
            end_time: data.end_time,
            weekdays: data.weekdays ?? [],
          },

    file: data.file ? data.file : null,

    attractions:
      data.promotion_attractions?.map((item: any) => ({
        id: Number(item.attractions.id),
        name: item.attractions.name,

        original_price: Number(item.original_price),

        discounted_price: Number(item.discounted_price),

        sort_order: Number(item.sort_order),
      })) ?? [],

    created_at: data.createdAt,
  };
};
