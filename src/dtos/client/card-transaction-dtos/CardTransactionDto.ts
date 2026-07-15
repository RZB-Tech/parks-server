import { CardTransactionType } from "../../../models/postgresql/card-transactions-model/enums";

export const ClientAttractionPaymentTransactionDTO = (
  data: CardTransactionModelI,
): ClientAttractionPaymentTransactionDTO => {
  return {
    id: Number(data.id),
    card: Number(data.card),
    attraction: Number(data.attraction),
    type: data.type,
    amount: Number(data.amount || 0),
    balance_before: Number(data.balance_before || 0),
    balance_after: Number(data.balance_after || 0),
    payment_type: data.payment_type,
    status: data.status,
  };
};

export const ClientTransactionDTO = (
  transaction: CardTransactionModelI,
  card: CardsModelI,
  attraction: AttractionModelI | null,
): ClientTransactionResponseDTO => {
  const amount = Number(transaction.amount || 0);

  const isTopup = transaction.type === CardTransactionType.TOPUP;

  return {
    id: Number(transaction.id),
    type: transaction.type,
    direction: isTopup ? "income" : "expense",
    amount,
    signed_amount: isTopup ? amount : -amount,
    balance_before: Number(transaction.balance_before || 0),
    balance_after: Number(transaction.balance_after || 0),
    payment_type: transaction.payment_type ?? null,
    status: transaction.status,
    card: {
      id: Number(card.id),
      card: card.card,
      type: card.type,
    },
    attraction: attraction
      ? {
          id: Number(attraction.id),
          name: attraction.name,
          main_file: attraction.main_file ? Number(attraction.main_file) : null,
        }
      : null,
    created_at:
      (transaction as any).created_at ?? (transaction as any).createdAt,
  };
};