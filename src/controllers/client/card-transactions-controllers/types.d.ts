declare interface ClientAttractionPaymentParams {
  attractionID: number;
}

declare interface GetClientTransactionsQuery {
  month: string;
  card?: number;
  type?:
    | CardTransactionType.PAYMENT
    | CardTransactionType.TOPUP
    | CardTransactionType.REFUND;
  page?: number;
  limit?: number;
}
