export const AttractionReportDTO = (
  data: AttractionReportModelI,
): AttractionReportDto => {
  return {
    id: Number(data.id),
    attraction: Number(data.attraction),
    operator: Number(data.operator),
    status: data.status,
    opened_at: data.opened_at,
    closed_at: data.closed_at,
    total_rounds: Number(data.total_rounds),
    total_people: Number(data.total_people),
    paid_amount: Number(data.paid_amount),
    total_amount: Number(data.total_amount),
    created_at: data.createdAt,
  };
};

