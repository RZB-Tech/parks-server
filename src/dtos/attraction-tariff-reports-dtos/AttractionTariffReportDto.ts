export const AttractionTariffReportDTO = (
  data: AttractionTariffReportPlain,
): AttractionTariffReportResponseDTO => ({
  attraction_tariff: Number(data.attraction_tariff),
  tariff_name: data.tariff_name,

  promotion:
    data.promotion !== null && data.promotion !== undefined
      ? Number(data.promotion)
      : null,
  promotion_code: data.promotion_code ?? null,
  promotion_name: data.promotion_name ?? null,
  promotion_type: data.promotion_type ?? null,

  discount_percent: Number(data.discount_percent || 0),

  original_unit_price: Number(data.original_unit_price || 0),
  sale_unit_price: Number(data.sale_unit_price || 0),

  rounds_count: Number(data.rounds_count || 0),
  total_people: Number(data.total_people || 0),
  refund_count: Number(data.refund_count || 0),

  total_virtual: Number(data.total_virtual || 0),
  total_classic: Number(data.total_classic || 0),
  total_vip: Number(data.total_vip || 0),
  total_organization: Number(data.total_organization || 0),

  total_online: Number(data.total_online || 0),
  total_offline: Number(data.total_offline || 0),

  original_amount: Number(data.original_amount || 0),
  discount_amount: Number(data.discount_amount || 0),
  total_amount: Number(data.total_amount || 0),
  paid_amount: Number(data.paid_amount || 0),
});

const tariffReportGroupKey = (report: AttractionTariffReportResponseDTO) =>
  [
    report.attraction_tariff,
    report.tariff_name,
    report.promotion ?? "basic",
    report.promotion_code ?? "basic",
    report.discount_percent,
    report.original_unit_price,
    report.sale_unit_price,
  ].join(":");

export const CombineAttractionTariffReportsDTO = (
  reports: AttractionTariffReportPlain[],
): AttractionTariffReportResponseDTO[] => {
  const grouped = new Map<string, AttractionTariffReportResponseDTO>();

  for (const source of reports) {
    const report = AttractionTariffReportDTO(source);
    const key = tariffReportGroupKey(report);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, report);
      continue;
    }

    current.rounds_count += report.rounds_count;
    current.total_people += report.total_people;
    current.refund_count += report.refund_count;

    current.total_virtual += report.total_virtual;
    current.total_classic += report.total_classic;
    current.total_vip += report.total_vip;
    current.total_organization += report.total_organization;

    current.total_online += report.total_online;
    current.total_offline += report.total_offline;

    current.original_amount += report.original_amount;
    current.discount_amount += report.discount_amount;
    current.total_amount += report.total_amount;
    current.paid_amount += report.paid_amount;
  }

  return [...grouped.values()].sort((first, second) => {
    if (first.promotion === null && second.promotion !== null) {
      return -1;
    }

    if (first.promotion !== null && second.promotion === null) {
      return 1;
    }

    return (
      first.tariff_name.localeCompare(second.tariff_name) ||
      first.original_unit_price - second.original_unit_price
    );
  });
};
