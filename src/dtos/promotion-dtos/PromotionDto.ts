import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";
import { CalculateAttractionSalePrice } from "../../utils/attractionPricing";

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
      data.promotion_attractions
        ?.filter((item: any) => item.attractions)
        .map((item: any) => {
          const attractionPrice = item.attractions.price;
          const isTariffPricing = attractionPrice === null;
          const discountPercent = Number(data.discount_percent);

          return {
            id: Number(item.attractions.id),
            name: item.attractions.name,
            size: Number(item.attractions.size || 1),
            pricing_type: isTariffPricing ? "tariff" : "single",
            original_price: isTariffPricing ? null : Number(attractionPrice),
            discounted_price: isTariffPricing
              ? null
              : CalculateAttractionSalePrice(
                  Number(attractionPrice),
                  discountPercent,
                ),
            tariffs: (item.attractions.tariffs ?? [])
              .map((tariff: AttractionTariffModelI) => ({
                id: Number(tariff.id),
                name: tariff.name,
                original_price: Number(tariff.price),
                discounted_price: CalculateAttractionSalePrice(
                  Number(tariff.price),
                  discountPercent,
                ),
                sort_order: Number(tariff.sort_order || 0),
              }))
              .sort(
                (
                  first: { sort_order: number },
                  second: { sort_order: number },
                ) => first.sort_order - second.sort_order,
              ),
            sort_order: Number(item.sort_order),
          };
        }) ?? [],

    created_at: data.createdAt,
  };
};
