declare interface CardTransactionModelI {
  id: number;
  card: number;
  operator: number | null;
  cashbox: number;
  attraction: number;
  xreport: number;
  type: CardTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_type: PaymentType;
  payment_card_type: PaymentCardType | null;
  payment_service: PaymentServiceType | null;
  status: CardTransactionStatusTypes;
  createdAt?: Date;
}
