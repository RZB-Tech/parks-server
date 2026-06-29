declare interface CashboxOperatorModelI {
  id: number;
  cashbox: number;
  operator: number;
  endAt: string;
  status: import("./enums").CashboxOperatorStatusTypes;
}
