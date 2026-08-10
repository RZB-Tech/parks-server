import { PromotionModel } from "../../../models/postgresql/promotion-model/PromotionModel";
import { PromotionTypes } from "../../../models/postgresql/promotion-model/enums";
import { CalculateAttractionSalePrice } from "../../../utils/attractionPricing";

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
        .map((item) => {
          const attraction = item.attractions!;
          const isTariffPricing = attraction.price === null;
          const discountPercent = Number(data.discount_percent);

          return {
            id: Number(attraction.id),
            name: attraction.name,
            size: Number(attraction.size || 1),
            pricing_type: isTariffPricing ? "tariff" : "single",
            original_price: isTariffPricing
              ? null
              : Number(attraction.price),
            discounted_price: isTariffPricing
              ? null
              : CalculateAttractionSalePrice(
                  Number(attraction.price),
                  discountPercent,
                ),
            tariffs: (attraction.tariffs ?? [])
              .map((tariff) => ({
                id: Number(tariff.id),
                name: tariff.name,
                original_price: Number(tariff.price),
                discounted_price: CalculateAttractionSalePrice(
                  Number(tariff.price),
                  discountPercent,
                ),
                sort_order: Number(tariff.sort_order || 0),
              }))
              .sort((first, second) => first.sort_order - second.sort_order),
            sort_order: Number(item.sort_order),
          };
        }) ?? [],
  };
};
