export const AttractionRoundOperatorDTO = (
  data: AttractionRoundOperatorPlain | null | undefined,
): AttractionRoundOperatorResponseDTO | null => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),

    firstname: data.firstname,
    lastname: data.lastname,

    phone_number: data.phone_number,

    telegram_username: data.telegram_username ?? null,

    role: Number(data.role),

    status: data.status,

    file:
      data.file !== null && data.file !== undefined ? Number(data.file) : null,
  };
};

export const AttractionRoundAttractionDTO = (
  data: AttractionRoundAttractionPlain | null | undefined,
): AttractionRoundAttractionResponseDTO | null => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),

    name: data.name,

    manufacturer: data.manufacturer ?? null,

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

    price: data.price === null ? null : Number(data.price),

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

    max_weight:
      data.max_weight !== null && data.max_weight !== undefined
        ? Number(data.max_weight)
        : null,

    description: data.description ?? null,
  };
};

export const AttractionRoundTransactionCardDTO = (
  data: AttractionRoundTransactionCardPlain | null | undefined,
): AttractionRoundTransactionCardResponseDTO | null => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),

    card: data.card,
    nfc: data.nfc,

    type: data.type,
    status: data.status,

    balance: Number(data.balance || 0),
  };
};

export const AttractionRoundTransactionDTO = (
  data: AttractionRoundTransactionPlain,
): AttractionRoundTransactionResponseDTO => {
  const card = AttractionRoundTransactionCardDTO(data.cards);

  const operator =
    data.operator !== null && data.operator !== undefined
      ? Number(data.operator)
      : null;

  return {
    id: Number(data.id),

    transaction_type: data.type,

    /*
     * Client paymentda operator null bo‘ladi.
     * Operator terminal paymentida operator ID mavjud.
     */
    payment_source: operator === null ? "client" : "operator",

    operator,

    attraction_tariff:
      data.attraction_tariff !== null && data.attraction_tariff !== undefined
        ? Number(data.attraction_tariff)
        : null,

    tariff_name: data.tariff_name ?? null,

    payment_type: data.payment_type,

    payment_card_type: data.payment_card_type ?? null,

    payment_service: data.payment_service ?? null,

    people_count: Number(data.people_count || 1),

    amount: Number(data.amount || 0),

    balance_before: Number(data.balance_before || 0),

    balance_after: Number(data.balance_after || 0),

    promotion:
      data.promotion !== null && data.promotion !== undefined
        ? Number(data.promotion)
        : null,

    promotion_code: data.promotion_code ?? null,

    promotion_name: data.promotion_name ?? "AKSIYASIZ",

    promotion_type: data.promotion_type ?? null,

    discount_percent: Number(data.discount_percent || 0),

    original_unit_price: Number(data.original_unit_price || 0),

    sale_unit_price: Number(data.sale_unit_price || 0),

    original_amount: Number(data.original_amount || 0),

    discount_amount: Number(data.discount_amount || 0),

    card: card ?? {
      id: Number(data.card),
    },

    created_at: data.createdAt ?? data.created_at,
  };
};

export const AttractionRoundDTO = (
  data: AttractionRoundWithRelationsPlain,
  transactions: AttractionRoundTransactionPlain[] = [],
): AttractionRoundResponseDTO => {
  const attraction =
    data.attractions !== undefined
      ? AttractionRoundAttractionDTO(data.attractions)
      : data.attraction !== null && data.attraction !== undefined
        ? Number(data.attraction)
        : null;

  const operator =
    data.operators !== undefined
      ? AttractionRoundOperatorDTO(data.operators)
      : data.operator !== null && data.operator !== undefined
        ? Number(data.operator)
        : null;

  return {
    id: Number(data.id),

    report: Number(data.report),

    attraction,

    operator,

    round_number: Number(data.round_number),

    status: data.status,

    /*
     * Round ichidagi barcha odamlar.
     */
    people_count: Number(data.people_count || 0),

    /*
     * Payment source counterlari.
     */
    offline_count: Number(data.offline_count || 0),

    online_count: Number(data.online_count || 0),

    /*
     * Card type counterlari.
     */
    virtual_count: Number(data.virtual_count || 0),

    classic_count: Number(data.classic_count || 0),

    vip_count: Number(data.vip_count || 0),

    organization_count: Number(data.organization_count || 0),

    paid_amount: Number(data.paid_amount || 0),

    total_amount: Number(data.total_amount || 0),

    started_at: data.started_at,

    finished_at: data.finished_at ?? null,

    created_at: data.createdAt ?? data.created_at,

    transactions: transactions.map(AttractionRoundTransactionDTO),
  };
};
