import { CardTransactionType } from "../../../models/postgresql/card-transactions-model/enums";

export const ClientAttractionPaymentTransactionDTO = (
  data: CardTransactionModelI,
): ClientAttractionPaymentTransactionDTO => {
  return {
    id: Number(data.id),
    card: Number(data.card),
    attraction: Number(data.attraction),
    attraction_tariff:
      data.attraction_tariff !== null && data.attraction_tariff !== undefined
        ? Number(data.attraction_tariff)
        : null,
    tariff_name: data.tariff_name ?? null,
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
  round: AttractionRoundModelI | null,
  cashbox: CashboxModelI | null,
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
    payment_service: transaction.payment_service ?? null,
    status: transaction.status,
    people_count: Number(transaction.people_count || 0),
    tariff:
      transaction.attraction_tariff !== null &&
      transaction.attraction_tariff !== undefined
        ? {
            id: Number(transaction.attraction_tariff),
            name: transaction.tariff_name ?? "",
          }
        : null,
    card: {
      id: Number(card.id),
      card: card.card,
      type: card.type,
    },
    cashbox: cashbox
      ? {
          id: Number(cashbox.id),
          name: cashbox.name,
        }
      : null,
    attraction: attraction
      ? {
          id: Number(attraction.id),
          name: attraction.name,
          main_file: attraction.main_file ? Number(attraction.main_file) : null,
          size: Number(attraction.size || 1),
        }
      : null,
    round: round
      ? {
          id: Number(round.id),
          round_number: Number(round.round_number),
        }
      : null,
    promotion: transaction.promotion
      ? {
          id: Number(transaction.promotion),
          code: transaction.promotion_code,
          name: transaction.promotion_name,
          type: transaction.promotion_type,
          discount_percent: Number(transaction.discount_percent || 0),
          original_unit_price: Number(transaction.original_unit_price || 0),
          sale_unit_price: Number(transaction.sale_unit_price || 0),
          original_amount: Number(transaction.original_amount || 0),
          discount_amount: Number(transaction.discount_amount || 0),
        }
      : null,
    created_at:
      (transaction as any).created_at ?? (transaction as any).createdAt,
  };
};
