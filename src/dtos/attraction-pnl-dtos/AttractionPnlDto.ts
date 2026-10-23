const metricFields = [
  "total",
  "rounds_count",
  "people_count",
  "virtual_count",
  "classic_count",
  "vip_count",
  "organization_count",
] as const;

const emptyMetrics = (): AttractionPnlMetrics => ({
  total: 0,
  rounds_count: 0,
  people_count: 0,
  virtual_count: 0,
  classic_count: 0,
  vip_count: 0,
  organization_count: 0,
});

const addMetrics = (
  target: AttractionPnlMetrics,
  source: AttractionPnlMetrics,
) => {
  for (const field of metricFields) {
    target[field] += source[field];
  }
  return target;
};

export const AttractionPnlDTO = (
  data: AttractionPnlDTOData,
): AttractionPnlResponseDTO => {
  const totalsByAttraction = new Map<number, Map<string, AttractionPnlMetrics>>();
  const totalsByMonth = new Map<string, AttractionPnlMetrics>(
    data.months.map((month) => [month, emptyMetrics()]),
  );

  for (const row of data.rows) {
    const attractionID = Number(row.attraction_id);
    const metrics = emptyMetrics();

    for (const field of metricFields) {
      metrics[field] = Number(row[field] || 0);
    }

    if (
      !Number.isInteger(attractionID) ||
      attractionID <= 0 ||
      !totalsByMonth.has(row.month) ||
      !metricFields.every((field) => Number.isFinite(metrics[field]))
    ) {
      continue;
    }

    const attractionTotals =
      totalsByAttraction.get(attractionID) ??
      new Map<string, AttractionPnlMetrics>();

    attractionTotals.set(
      row.month,
      addMetrics(attractionTotals.get(row.month) ?? emptyMetrics(), metrics),
    );
    totalsByAttraction.set(attractionID, attractionTotals);
    addMetrics(totalsByMonth.get(row.month)!, metrics);
  }

  const attractions = data.attractions.map((attraction) => {
    const attractionID = Number(attraction.id);
    const attractionTotals = totalsByAttraction.get(attractionID);
    const months = data.months.map((month) => ({
      month,
      ...(attractionTotals?.get(month) ?? emptyMetrics()),
    }));

    return {
      id: attractionID,
      name: attraction.name,
      price: attraction.price,
      months,
      ...months.reduce(addMetrics, emptyMetrics()),
    };
  });

  const totals = data.months.map((month) => ({
    month,
    ...totalsByMonth.get(month)!,
  }));
  const { total: grandTotal, ...counts } = totals.reduce(addMetrics, emptyMetrics());

  return {
    start_month: data.start_month,
    end_month: data.end_month,
    months: data.months,
    attractions,
    totals,
    grand_total: grandTotal,
    ...counts,
  };
};
