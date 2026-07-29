declare interface PaymeTransactionModelI {
  id: number;

  payment_order: number;
  card_transaction: number | null;

  payme_id: string;
  payme_time: number;

  /*
   * Payme yuboradigan summa tiyinlarda saqlanadi.
   */
  amount: number;

  account: Record<string, unknown>;
  receivers: Array<Record<string, unknown>> | null;

  state: import("./enums").PaymeTransactionStateTypes;
  reason: number | null;

  create_time: number;
  perform_time: number;
  cancel_time: number;

  createdAt?: Date;
  updatedAt?: Date;
}
