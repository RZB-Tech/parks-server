export const PromotionReportDTO = (data: PromotionReportPlain) => {
  return {
    promotion:
      data.promotion !== null && data.promotion !== undefined
        ? Number(data.promotion)
        : null,

    promotion_key: data.promotion_key,

    promotion_code: data.promotion_code ?? null,

    promotion_name: data.promotion_name ?? "AKSIYASIZ",

    promotion_type: data.promotion_type ?? null,

    discount_percent: Number(data.discount_percent || 0),

    original_unit_price: Number(data.original_unit_price || 0),

    sale_unit_price: Number(data.sale_unit_price || 0),

    transactions_count: Number(data.transactions_count || 0),

    total_people: Number(data.total_people || 0),

    total_virtual: Number(data.total_virtual || 0),

    total_classic: Number(data.total_classic || 0),

    total_vip: Number(data.total_vip || 0),

    total_organization: Number(data.total_organization || 0),

    total_online: Number(data.total_online || 0),

    total_offline: Number(data.total_offline || 0),

    original_amount: Number(data.original_amount || 0),

    discount_amount: Number(data.discount_amount || 0),

    paid_amount: Number(data.paid_amount || 0),
  };
};
