export const CashboxOperatorDTO = (
  data: CashboxOperatorWithEmployeeModelI,
): CashboxOperatorResponseDTO => {
  return {
    id: Number(data.id),
    cashbox: Number(data.cashbox),
    status: data.status,

    operator: data.operators
      ? {
          id: Number(data.operators.id),
          firstname: data.operators.firstname,
          lastname: data.operators.lastname,
          file:
            data.operators.file !== null ? Number(data.operators.file) : null,
        }
      : null,
  };
};

export const CashboxOperatorByEmployeeDTO = (
  data: CashboxOperatorByEmployee,
) => {
  const cashier = data.operators;
  const cashbox = data.cashboxes;

  return {
    id: Number(data.id),
    status: data.status,
    endAt: data.endAt ?? null,
    firstname: cashier?.firstname,
    lastname: cashier?.lastname,
    fullname: `${cashier?.firstname} ${cashier?.lastname}`,
    file: cashier?.file !== null ? Number(cashier?.file) : null,
    phone_number: cashier?.phone_number,
    telegram_username: cashier?.telegram_username,
    createdAt: cashier?.createdAt ?? cashier?.created_at,
    cashbox: cashbox
      ? {
          id: Number(cashbox.id),
          cashboxName: cashbox.name,
          place: cashbox.place,
          status: cashbox.status,
        }
      : null,
  };
};
