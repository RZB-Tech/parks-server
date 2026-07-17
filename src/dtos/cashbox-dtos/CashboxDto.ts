export const CashboxWithOperatorsDTO = (
  data: CashboxModelI,
): CashboxWithOperatorResponseDTO => {
  return {
    id: Number(data.id),
    device: Number(data.device),
    name: data.name,
    place: data.place,
    status: data.status,
    description: data.description,
    main_file: data.main_file,
    dashboard_file: data.dashboard_file,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,

    operators: Array.isArray(data.cashbox_operator)
      ? data.cashbox_operator
          .filter((cashboxOperator) => cashboxOperator.operators)
          .map((cashboxOperator) => ({
            id: Number(cashboxOperator.operators.id),
            firstname: cashboxOperator.operators.firstname,
            lastname: cashboxOperator.operators.lastname,
            file:
              cashboxOperator.operators.file !== null
                ? Number(cashboxOperator.operators.file)
                : null,
          }))
      : [],
  };
};

export const CashboxDTO = (data: CashboxModelI): CashboxResnponseDTO => {
  return {
    id: Number(data.id),
    name: data.name,
    place: data.place,
    status: data.status,
    description: data.description,
    main_file: data.main_file,
    dashboard_file: data.dashboard_file,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
};
