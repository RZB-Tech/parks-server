export const AttractionRoundDTO = (
  data: AttractionRoundModelI,
) => {
  return {
    id: Number(data.id),
    report: Number(data.report),
    attraction: Number(data.attraction),
    operator: Number(data.operator),

    round_number: Number(data.round_number),
    status: data.status,

    people_count: Number(data.people_count),
    offline_count: Number(data.offline_count),
    online_count: Number(data.online_count),
    vip_count: Number(data.vip_count),
    guest_count: Number(data.guest_count),
    park_staff_count: Number(data.park_staff_count),

    paid_amount: Number(data.paid_amount),
    total_amount: Number(data.total_amount),

    started_at: data.started_at,
    finished_at: data.finished_at,

    created_at: data.createdAt,
  };
};
