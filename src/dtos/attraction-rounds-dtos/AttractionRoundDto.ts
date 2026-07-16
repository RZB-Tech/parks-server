
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

export const AttractionRoundTransactionDTO = (
  data: AttractionRoundTransactionPlain,
) => {
  return {
    id: Number(data.id),

    transaction_type: data.type,

    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),

    card:
      data.cards !== undefined
        ? {
            id: Number(data.cards.id),
            card: data.cards.card,
            nfc: data.cards.nfc,
            type: data.cards.type,
            status: data.cards.status,
            balance: Number(data.cards.balance || 0),
          }
        : {
            id: Number(data.card),
          },

    created_at: data.createdAt,
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
    virtual_count: Number(data.online_count || 0),
    classic_count: Number(data.online_count || 0),
    vip_count: Number(data.vip_count || 0),
    organization_count: Number(data.organization_count || 0),

    paid_amount: Number(data.paid_amount || 0),
    total_amount: Number(data.total_amount || 0),

    started_at: data.started_at,
    finished_at: data.finished_at ?? null,

    created_at: data.createdAt,
  };
};
