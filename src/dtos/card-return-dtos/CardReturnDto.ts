export const CardReturnListItemDTO = (
  data: CardReturnListPlain,
): CardReturnListItemResponseDTO => ({
  id: Number(data.id),
  returned_at: data.returned_at,
  old_card: {
    id: data.old_card !== null ? Number(data.old_card) : null,
    card: data.old_card_number,
  },
  new_card: {
    id: data.new_card !== null ? Number(data.new_card) : null,
    card: data.new_card_number,
  },
  amount: Number(data.amount || 0),
  description: data.description ?? null,
  operator: data.operators
    ? {
        id: Number(data.operators.id),
        firstname: data.operators.firstname,
        lastname: data.operators.lastname,
      }
    : null,
  cashbox: data.cashboxes
    ? {
        id: Number(data.cashboxes.id),
        name: data.cashboxes.name,
      }
    : null,
  xreport: data.xreport !== null ? Number(data.xreport) : null,
  zreport: data.zreport !== null ? Number(data.zreport) : null,
});
