export const CardLastTransactionDTO = (data: CardTransactionModelI) => {
  return {
    id: Number(data.id),
    type: data.type,
    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),
    payment_type: data.payment_type,
    payment_card_type: data.payment_card_type ?? null,
    payment_service_type: data.payment_service ?? null,
    status: data.status,
    created_at: data.created_at,
  };
};

export const CardTransactionDTO = (
  data: CardTransactionModelI & {
    card_data?: Partial<CardsModelI>;
  },
): CardTransactionResponseDTO => {
  return {
    id: Number(data.id || 0),
    nfc: data.card_data?.nfc ?? "",
    type: data.type,
    payment_type: data.payment_type ?? null,
    payment_card_type: data.payment_card_type ?? null,
    payment_service_type: data.payment_service ?? null,
    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),
    status: data.status,
    operator: Number(data.operator || 0),
    cashbox: Number(data.cashbox || 0),
    xreport:
      data.xreport !== undefined && data.xreport !== null
        ? Number(data.xreport)
        : null,
    created_at: data.created_at,
  };
};

export const CardTransactionHistoryCardDTO = (
  data?: Partial<CardsModelI> | null,
): CardTransactionHistoryCardDTO | null => {
  if (!data) return null;

  return {
    id: Number(data.id || 0),
    card: data.card ?? "",
    status: data.status ?? "",
  };
};

export const CardTransactionHistoryOperatorDTO = (
  data?: Partial<EmployeeModelI> | null,
): CardTransactionHistoryOperatorDTO | null => {
  if (!data) return null;

  return {
    id: Number(data.id || 0),
    firstname: data.firstname ?? "",
    lastname: data.lastname ?? "",
    file:
      data.file !== null && data.file !== undefined ? Number(data.file) : null,
  };
};

export const CardTransactionHistoryDTO = (
  data: CardTransactionHistoryPlain,
): CardTransactionHistoryResponseDTO => {
  return {
    id: Number(data.id || 0),

    card: CardTransactionHistoryCardDTO(data.cards),
    operator: CardTransactionHistoryOperatorDTO(data.operators),

    type: data.type,
    payment_type: data.payment_type ?? null,
    payment_card_type: data.payment_card_type ?? null,
    payment_service_type: data.payment_service ?? null,

    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),

    status: data.status,
    cashbox: Number(data.cashbox || 0),

    xreport:
      data.xreport !== undefined && data.xreport !== null
        ? Number(data.xreport)
        : null,

    created_at: data.created_at,
  };
};

export const CardPaymentTransactionDTO = (
  data: CardTransactionModelI & {
    card_data?: Partial<CardsModelI>;
  },
): CardPaymentTransactionDTO => {
  return {
    id: Number(data.id || 0),
    card: Number(data.card || 0),
    nfc: data.card_data?.nfc ?? "",

    operator: Number(data.operator || 0),
    cashbox:
      data.cashbox !== undefined && data.cashbox !== null
        ? Number(data.cashbox)
        : null,
    attraction:
      data.attraction !== undefined && data.attraction !== null
        ? Number(data.attraction)
        : null,
    xreport:
      data.xreport !== undefined && data.xreport !== null
        ? Number(data.xreport)
        : null,

    type: data.type,
    payment_type: data.payment_type ?? null,
    payment_card_type: data.payment_card_type ?? null,
    payment_service_type: data.payment_service ?? null,

    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),

    status: data.status,
    created_at: data.created_at,
  };
};

export const CardPaymentSuccessDTO = (
  data: CardTransactionModelI & {
    card_data?: Partial<CardsModelI>;
  },
): CardPaymentResponseDTO => {
  return {
    paid: true,
    message: "Payment successful!",
    transaction: CardPaymentTransactionDTO(data),
  };
};

export const CardPaymentFailedDTO = (
  message: string,
): CardPaymentResponseDTO => {
  return {
    paid: false,
    message,
    transaction: null,
  };
};