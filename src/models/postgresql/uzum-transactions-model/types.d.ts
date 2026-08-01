declare interface UzumTransactionModelI {
  id: number;
  payment_order: number;
  card_transaction: number | null;
  uzum_order_id: string;
  merchant_operation_id: string | null;
  order_number: string;
  amount: number;
  redirect_url: string;
  state: import("./enums").UzumTransactionStateTypes;
  operation_type: string | null;
  rrn: string | null;
  card_type: number | null;
  binding_id: string | null;
  raw_callback: Record<string, unknown> | null;
  registered_at: Date;
  completed_at: Date | null;
  declined_at: Date | null;
  refunded_at: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
