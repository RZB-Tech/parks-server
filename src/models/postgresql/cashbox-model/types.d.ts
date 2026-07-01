declare interface CashboxModelI {
  id: number;
  device: number;
  name: string;
  place: string;
  description: string;
  status: import("./enums").CashboxStatusTypes;

  cashbox_operator?: CashboxOperatorModelI & {
    operators?: EmployeeModelI;
  };
}
