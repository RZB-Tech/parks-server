export const AttractionPnlDTO = (
  data: AttractionPnlDTOData,
): AttractionPnlResponseDTO => {
  const totalsByAttraction = new Map<number, Map<string, number>>();
  const totalsByMonth = new Map<string, number>(
    data.months.map((month) => [month, 0]),
  );

  for (const row of data.rows) {
    const attractionID = Number(row.attraction_id);
    const total = Number(row.total || 0);

    if (
      !Number.isInteger(attractionID) ||
      attractionID <= 0 ||
      !totalsByMonth.has(row.month) ||
      !Number.isFinite(total)
    ) {
      continue;
    }

    const attractionTotals =
      totalsByAttraction.get(attractionID) ?? new Map<string, number>();

    attractionTotals.set(
      row.month,
      (attractionTotals.get(row.month) ?? 0) + total,
    );
    totalsByAttraction.set(attractionID, attractionTotals);
    totalsByMonth.set(row.month, (totalsByMonth.get(row.month) ?? 0) + total);
  }

  const attractions = data.attractions.map((attraction) => {
    const attractionID = Number(attraction.id);
    const attractionTotals = totalsByAttraction.get(attractionID);
    const months = data.months.map((month) => ({
      month,
      total: attractionTotals?.get(month) ?? 0,
    }));

    return {
      id: attractionID,
      name: attraction.name,
      months,
      total: months.reduce((sum, item) => sum + item.total, 0),
    };
  });

  const totals = data.months.map((month) => ({
    month,
    total: totalsByMonth.get(month) ?? 0,
  }));

  return {
    start_month: data.start_month,
    end_month: data.end_month,
    months: data.months,
    attractions,
    totals,
    grand_total: totals.reduce((sum, item) => sum + item.total, 0),
  };
};
