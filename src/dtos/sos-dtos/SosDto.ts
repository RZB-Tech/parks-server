export const SOSReportDTO = (data: SOSReportWithRelationsDTO) => {
  const attractionOperator = data.attractionOperator ?? null;
  const cashboxOperator = data.cashboxOperator ?? null;

  const employee =
    data.directOperator ??
    attractionOperator?.operators ??
    cashboxOperator?.operators ??
    null;

  const attraction =
    data.directAttraction ?? attractionOperator?.attractions ?? null;
  const cashbox = cashboxOperator?.cashboxes ?? null;

  const source = data.attraction || data.attraction_operator
    ? "attraction"
    : data.cashbox_operator
      ? "cashbox"
      : null;

  return {
    id: Number(data.id),

    source,

    description: data.description,

    operator: employee
      ? {
          id: Number(employee.id),
          fullname: `${employee.firstname} ${employee.lastname}`.trim(),
          phone_number: employee.phone_number,
        }
      : null,

    attraction: attraction
      ? {
          id: Number(attraction.id),
          name: attraction.name,
        }
      : null,

    cashbox: cashbox
      ? {
          id: Number(cashbox.id),
          name: cashbox.name,
        }
      : null,

    createdAt: data.createdAt,
  };
};
