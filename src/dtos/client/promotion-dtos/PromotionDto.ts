import { PromotionModel } from "../../../models/postgresql/promotion-model/PromotionModel";
import { PromotionTypes } from "../../../models/postgresql/promotion-model/enums";

export const ClientPromotionDTO = (
  promotion: PromotionModel,
): ClientPromotionResponseDTO => {
  const data = promotion.get({ plain: true }) as unknown as Omit<
    PromotionModelI,
    "promotion_attractions"
  > & {
    promotion_attractions?: Array<
      PromotionAttractionModelI & {
        attractions?: AttractionModelI;
      }
    >;
  };

  return {
    id: Number(data.id),
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    type: data.type,
    status: data.status,
    discount_percent: Number(data.discount_percent),
    schedule:
      data.type === PromotionTypes.ONE_TIME
        ? {
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            start_date: data.start_date,
            end_date: data.end_date,
            start_time: data.start_time,
            end_time: data.end_time,
          }
        : {
            start_time: data.start_time,
            end_time: data.end_time,
            weekdays: data.weekdays ?? [],
          },
    file: data.file ? Number(data.file) : null,
    attractions:
      data.promotion_attractions
        ?.filter((item) => item.attractions)
        .map((item) => ({
          id: Number(item.attractions!.id),
          name: item.attractions!.name,
          original_price: Number(item.original_price),
          discounted_price: Number(item.discounted_price),
          sort_order: Number(item.sort_order),
        })) ?? [],
  };
};
