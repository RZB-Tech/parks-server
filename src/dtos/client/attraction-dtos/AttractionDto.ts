export const ClientAttractionDTO = (
  data: AttractionModelI,
  promotion: ActivePromotionForAttractionDTO | null = null,
): ClientAttractionResponseDTO => {
  const originalPrice = promotion
    ? Number(promotion.original_price)
    : Number(data.price || 0);

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
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    original_price: originalPrice,
    price: promotion
      ? Number(promotion.discounted_price)
      : Number(data.price || 0),
    discount_percent: promotion ? Number(promotion.discount_percent) : 0,
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
    promotion: promotion
      ? {
          id: Number(promotion.id),
          code: promotion.code,
          name: promotion.name,
          type: promotion.type,
          discount_percent: Number(promotion.discount_percent),
          original_price: Number(promotion.original_price),
          discounted_price: Number(promotion.discounted_price),
          started_at: promotion.promotion_started_at,
          ended_at: promotion.promotion_ended_at,
        }
      : null,
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
  const availableSeats = Math.max(totalSeats - occupiedSeats, 0);
  const originalPrice = data.promotion
    ? Number(data.promotion.original_price)
    : Number(data.attraction.price || 0);

  return {
    id: Number(data.attraction.id),
    name: data.attraction.name,
    original_price: originalPrice,
    price: data.promotion
      ? Number(data.promotion.discounted_price)
      : Number(data.attraction.price || 0),
    discount_percent: data.promotion
      ? Number(data.promotion.discount_percent)
      : 0,
    promotion: data.promotion
      ? {
          id: Number(data.promotion.id),
          code: data.promotion.code,
          name: data.promotion.name,
          type: data.promotion.type,
          discount_percent: Number(data.promotion.discount_percent),
          original_price: Number(data.promotion.original_price),
          discounted_price: Number(data.promotion.discounted_price),
          started_at: data.promotion.promotion_started_at,
          ended_at: data.promotion.promotion_ended_at,
        }
      : null,
    main_file: data.attraction.main_file
      ? Number(data.attraction.main_file)
      : null,
    seats: totalSeats,

    round: data.lastRound
      ? {
          id: Number(data.lastRound.id),
          round_number: Number(data.lastRound.round_number || 0),
          total_seats: totalSeats,
          occupied_seats: occupiedSeats,
          available_seats: availableSeats,
        }
      : null,

    // Round mavjud bo‘lmasa barcha o‘rinlar bo‘sh hisoblanadi
    available_seats: data.lastRound ? availableSeats : totalSeats,
  };
};
