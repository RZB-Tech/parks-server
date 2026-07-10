declare interface CashboxModelI {
  id: number;
  device: number;
  name: string;
  place: string;
  description: string;
  status: import("./enums").CashboxStatusTypes;
  main_file: number;
  dashboard_file: number;

  cashbox_operator?: CashboxOperatorModelI & {
    operators?: EmployeeModelI;
  };
}
