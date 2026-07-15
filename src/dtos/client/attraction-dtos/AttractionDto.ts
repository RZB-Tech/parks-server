export const ClientAttractionDTO = (
  data: AttractionModelI,
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
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    price: Number(data.price || 0),
    duration: Number(data.duration || 0),
    seats: Number(data.seats || 0),
    age_limit: data.age_limit !== null ? Number(data.age_limit) : null,
    min_height: data.min_height !== null ? Number(data.min_height) : null,
    max_weight: data.max_weight !== null ? Number(data.max_weight) : null,
    description: data.description ?? null,
  };
};

interface AttractionLastRoundData {
  attraction: AttractionModelI;
  lastRound: AttractionRoundModelI | null;
}

export const AttractionLastRoundDTO = (
  data: AttractionLastRoundData,
): AttractionLastRoundResponseDTO => {
  const totalSeats = Number(data.attraction.seats || 0);
  const occupiedSeats = Number(data.lastRound?.people_count || 0);
  const availableSeats = Math.max(totalSeats - occupiedSeats, 0);

  return {
    id: Number(data.attraction.id),
    name: data.attraction.name,
    price: Number(data.attraction.price || 0),
    main_file: data.attraction.main_file
      ? Number(data.attraction.main_file)
      : null,

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