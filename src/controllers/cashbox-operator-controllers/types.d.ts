declare interface CashboxOperatorParams {
  cashboxID: number;
  operatorID: number;
}

declare interface CreateCashboxOperatorData extends Omit<
  CashboxOperatorModelI,
  "id" | "status" | "cashbox"
> {}

declare interface UpdateCashboxOperatorData extends Omit<
  CashboxOperatorModelI,
  "id" | "cashbox"
> {}
