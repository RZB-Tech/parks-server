
export const AttractionRoundOperatorDTO = (
  data: AttractionRoundOperatorPlain | null | undefined,
) => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    firstname: data.firstname,
    lastname: data.lastname,
    phone_number: data.phone_number,
    telegram_username: data.telegram_username,
    role: Number(data.role),
    status: data.status,
    file: data.file !== null ? Number(data.file) : null,
  };
};

export const AttractionRoundAttractionDTO = (
  data: AttractionRoundAttractionPlain | null | undefined,
) => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    name: data.name,
    manufacturer: data.manufacturer,
    status: data.status,

    dashboard_file:
      data.dashboard_file !== null && data.dashboard_file !== undefined
        ? Number(data.dashboard_file)
        : null,

    main_file:
      data.main_file !== null && data.main_file !== undefined
        ? Number(data.main_file)
        : null,

    files: Array.isArray(data.files) ? data.files.map(Number) : [],

    price: Number(data.price || 0),
    duration: Number(data.duration || 0),
    seats: Number(data.seats || 0),

    age_limit:
      data.age_limit !== null && data.age_limit !== undefined
        ? Number(data.age_limit)
        : null,

    min_height:
      data.min_height !== null && data.min_height !== undefined
        ? Number(data.min_height)
        : null,

    max_weight: Number(data.max_weight || 0),

    description: data.description,
  };
};

export const AttractionRoundDTO = (data: AttractionRoundWithRelationsPlain) => {
  return {
    id: Number(data.id),

    report: Number(data.report),

    attraction:
      data.attractions !== undefined
        ? AttractionRoundAttractionDTO(data.attractions)
        : Number(data.attraction),

    operator:
      data.operators !== undefined
        ? AttractionRoundOperatorDTO(data.operators)
        : Number(data.operator),

    round_number: Number(data.round_number),
    status: data.status,

    people_count: Number(data.people_count || 0),
    offline_count: Number(data.offline_count || 0),
    online_count: Number(data.online_count || 0),
    vip_count: Number(data.vip_count || 0),
    guest_count: Number(data.guest_count || 0),
    park_staff_count: Number(data.park_staff_count || 0),

    paid_amount: Number(data.paid_amount || 0),
    total_amount: Number(data.total_amount || 0),

    started_at: data.started_at,
    finished_at: data.finished_at ?? null,

    created_at: data.createdAt,
  };
};
