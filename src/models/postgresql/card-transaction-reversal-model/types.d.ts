declare interface CardTransactionReversalModelI {
  id: number;
  original_transaction: number;
  refund_transaction: number;
  card: number;
  cashbox: number;
  cancelled_by: number;
  amount: number;
  reason: string;
  cancelled_at: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
