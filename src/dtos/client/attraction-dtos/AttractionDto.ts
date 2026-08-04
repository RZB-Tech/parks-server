import { AttractionRoundStatusTypes } from "../../../models/postgresql/attraction-round-model/enums";
import { CalculateAttractionSalePrice } from "../../../utils/attractionPricing";

const ClientAttractionTariffsDTO = (
  tariffs: AttractionTariffModelI[] | undefined,
  promotion: ActivePromotionForAttractionDTO | null,
) => {
  const discountPercent = promotion ? Number(promotion.discount_percent) : 0;

  return (tariffs ?? [])
    .map((tariff) => {
      const originalPrice = Number(tariff.price || 0);

      return {
        id: Number(tariff.id),
        name: tariff.name,
        original_price: originalPrice,
        price: promotion
          ? CalculateAttractionSalePrice(originalPrice, discountPercent)
          : originalPrice,
        discount_percent: discountPercent,
        sort_order: Number(tariff.sort_order || 0),
      };
    })
    .sort((first, second) => first.sort_order - second.sort_order);
};

const ClientAttractionPricingDTO = (
  data: AttractionModelI,
  promotion: ActivePromotionForAttractionDTO | null,
) => {
  const isTariffPricing = data.price === null;
  const discountPercent = promotion ? Number(promotion.discount_percent) : 0;
  const originalPrice = isTariffPricing ? null : Number(data.price || 0);

  return {
    pricing_type: isTariffPricing ? "tariff" : "single",
    original_price: originalPrice,
    price:
      originalPrice === null
        ? null
        : promotion
          ? CalculateAttractionSalePrice(originalPrice, discountPercent)
          : originalPrice,
    discount_percent: discountPercent,
    tariffs: ClientAttractionTariffsDTO(data.tariffs, promotion),
  } as const;
};

const ClientPromotionDTO = (
  data: AttractionModelI,
  promotion: ActivePromotionForAttractionDTO | null,
) => {
  if (!promotion) return null;

  const originalPrice = data.price === null ? null : Number(data.price || 0);

  return {
    id: Number(promotion.id),
    code: promotion.code,
    name: promotion.name,
    type: promotion.type,
    discount_percent: Number(promotion.discount_percent),
    original_price: originalPrice,
    discounted_price:
      originalPrice === null
        ? null
        : CalculateAttractionSalePrice(
            originalPrice,
            Number(promotion.discount_percent),
          ),
    started_at: promotion.promotion_started_at,
    ended_at: promotion.promotion_ended_at,
  };
};

export const ClientAttractionDTO = (
  data: AttractionModelI,
  promotion: ActivePromotionForAttractionDTO | null = null,
): ClientAttractionResponseDTO => {
  return {
    id: Number(data.id),
    name: data.name,
    status: data.status,
    dashboard_file: data.dashboard_file ? Number(data.dashboard_file) : null,
    main_file: data.main_file ? Number(data.main_file) : null,
    files: Array.isArray(data.files) ? data.files.map(Number) : [],
    sub_attraction_files: Array.isArray(data.sub_attraction_files)
      ? data.sub_attraction_files.map(Number)
      : null,
    size: Number(data.size || 1),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    ...ClientAttractionPricingDTO(data, promotion),
    duration: Number(data.duration || 0),
    seats: Number(data.seats || 0),
    age_limit: data.age_limit !== null ? Number(data.age_limit) : null,
    min_height: data.min_height !== null ? Number(data.min_height) : null,
    max_weight: data.max_weight !== null ? Number(data.max_weight) : null,
    description: data.description ?? null,
  };
};

export const ClientAttractionDetailsDTO = (
  data: AttractionModelI,
  promotion: ActivePromotionForAttractionDTO | null,
): ClientAttractionDetailsResponseDTO => {
  return {
    ...ClientAttractionDTO(data, promotion),
    promotion: ClientPromotionDTO(data, promotion),
  };
};

interface AttractionLastRoundData {
  attraction: AttractionModelI;
  lastRound: AttractionRoundModelI | null;
  promotion: ActivePromotionForAttractionDTO | null;
}

export const AttractionLastRoundDTO = (
  data: AttractionLastRoundData,
): AttractionLastRoundResponseDTO => {
  const totalSeats = Number(data.attraction.seats || 0);
  const occupiedSeats = Number(data.lastRound?.people_count || 0);
  const isOpenRound =
    data.lastRound?.status === AttractionRoundStatusTypes.OPEN;
  const availableSeats = isOpenRound
    ? Math.max(totalSeats - occupiedSeats, 0)
    : totalSeats;
  const pricing = ClientAttractionPricingDTO(
    data.attraction,
    data.promotion,
  );

  return {
    id: Number(data.attraction.id),
    name: data.attraction.name,
    ...pricing,
    promotion: ClientPromotionDTO(data.attraction, data.promotion),
    main_file: data.attraction.main_file
      ? Number(data.attraction.main_file)
      : null,
    size: Number(data.attraction.size || 1),
    seats: totalSeats,

    round: data.lastRound
      ? {
          id: Number(data.lastRound.id),
          round_number: Number(data.lastRound.round_number || 0),
          status: data.lastRound.status,
          total_seats: totalSeats,
          occupied_seats: occupiedSeats,
          available_seats: availableSeats,
        }
      : null,

    available_seats: availableSeats,
  };
};
