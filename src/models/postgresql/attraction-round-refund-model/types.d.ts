declare interface AttractionRoundRefundModelI {
  id: number;
  round: number;
  attraction: number;
  operator: number;
  card: number;
  original_transaction: number;
  refund_transaction: number;
  amount: number;
  people_count: number;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}
