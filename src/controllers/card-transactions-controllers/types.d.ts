declare interface CheckNFCCardData {
  nfc: string;
}

declare interface CardTopUpTransactionData {
  nfc: string;
  amount: number;
  payment_type: PaymentType;
  payment_card_type?: PaymentCardType | null;
  payment_service_type?: PaymentServiceType | null;
  description?: string | null;
}

declare interface GetCashboxCardTransactionsQuery {
  page?: number;
  limit?: number;
}