declare enum CardCheckType {
  NFC = "nfc",
  CARD = "card",
}

declare interface CheckNFCCardData {
  type: CardCheckType;
  id: string;
}

declare interface CardTopUpTransactionData {
  type: CardCheckType;
  id: string;
  amount: number;
  payment_type: PaymentType;
  payment_card_type?: PaymentCardType | null;
  payment_service_type?: PaymentServiceType | null;
  description?: string | null;
}

declare interface GetCashboxCardTransactionsQuery {
  date?: string;
  page?: number;
  limit?: number;
}

declare interface CardPaymentTransactionData {
  nfc: string;
  attractionID: number;
}

declare interface CardRefundData {
  old_card: string;
  new_card: string;
  amount: number;
  description?: string | null;
}
