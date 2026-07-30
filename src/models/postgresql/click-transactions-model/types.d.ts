declare interface ClickTransactionModelI {
  id: number;
  payment_order: number;
  card_transaction: number | null;
  click_trans_id: string;
  click_paydoc_id: string;
  merchant_prepare_id: string;
  amount: number;
  status: import("./enums").ClickTransactionStatusTypes;
  error: number | null;
  error_note: string | null;
  prepared_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
