export const AttractionRoundRefundTransactionDTO = (
  transaction?: AttractionRoundRefundTransactionPlain | null,
): AttractionRoundRefundTransactionResponseDTO | null => {
  if (!transaction) {
    return null;
  }

  return {
    id: Number(transaction.id),
    type: transaction.type,
    status: transaction.status,
    amount: Number(transaction.amount || 0),
    people_count: Number(transaction.people_count || 0),
    balance_before: Number(transaction.balance_before || 0),
    balance_after: Number(transaction.balance_after || 0),
    payment_type: transaction.payment_type,
    payment_card_type: transaction.payment_card_type ?? null,
    payment_service_type: transaction.payment_service ?? null,
    promotion:
      transaction.promotion !== null && transaction.promotion !== undefined
        ? Number(transaction.promotion)
        : null,
    created_at: transaction.createdAt ?? null,
  };
};

export const AttractionRoundRefundListItemDTO = (
  refund: AttractionRoundRefundListPlain,
): AttractionRoundRefundListItemResponseDTO => ({
  id: Number(refund.id),
  amount: Number(refund.amount || 0),
  people_count: Number(refund.people_count || 0),
  description: refund.description,
  refunded_at: refund.createdAt ?? null,
  round: refund.rounds
    ? {
        id: Number(refund.rounds.id),
        round_number: Number(refund.rounds.round_number || 0),
        status: refund.rounds.status,
        started_at: refund.rounds.started_at,
        finished_at: refund.rounds.finished_at ?? null,
      }
    : null,
  attraction: refund.attractions
    ? {
        id: Number(refund.attractions.id),
        name: refund.attractions.name,
      }
    : null,
  operator: refund.operators
    ? {
        id: Number(refund.operators.id),
        firstname: refund.operators.firstname,
        lastname: refund.operators.lastname,
      }
    : null,
  card: refund.cards
    ? {
        id: Number(refund.cards.id),
        card_number: refund.cards.card,
        nfc: refund.cards.nfc,
        type: refund.cards.type,
        status: refund.cards.status,
      }
    : null,
  original_transaction: AttractionRoundRefundTransactionDTO(
    refund.original_transactions,
  ),
  refund_transaction: AttractionRoundRefundTransactionDTO(
    refund.refund_transactions,
  ),
});

export const AttractionRoundRefundsDTO = (
  refunds: AttractionRoundRefundListPlain[],
  pagination: AttractionRoundRefundsPaginationPlain,
): GetAttractionRoundRefundsResponseDTO => ({
  refunds: refunds.map(AttractionRoundRefundListItemDTO),
  total: Number(pagination.total || 0),
  page: Number(pagination.page),
  limit: Number(pagination.limit),
  totalPages: Math.ceil(
    Number(pagination.total || 0) / Number(pagination.limit),
  ),
});

export const AttractionRoundRefundDTO = (
  refund: CreatedAttractionRoundRefundPlain,
): AttractionRoundRefundResponseDTO => ({
  round: Number(refund.round),
  attraction: Number(refund.attraction),
  refunded_amount: Number(refund.refunded_amount || 0),
  refunded_people: Number(refund.refunded_people || 0),
  original_transaction_ids: refund.original_transaction_ids.map(Number),
  refund_transactions: refund.refund_transactions.map((transaction) => ({
    id: Number(transaction.id),
    original_transaction: Number(transaction.original_transaction),
    amount: Number(transaction.amount || 0),
    people_count: Number(transaction.people_count || 0),
  })),
  card: {
    id: Number(refund.card.id),
    balance_before: Number(refund.card.balance_before || 0),
    balance_after: Number(refund.card.balance_after || 0),
  },
  description: refund.description,
});
