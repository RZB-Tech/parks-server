declare interface CashboxModelI {
  id: number;
  device: number | null;
  name: string;
  place: string;
  description: string;
  status: import("./enums").CashboxStatusTypes;
  type: import("./enums").CashboxTypes;
  system_key: string | null;
  main_file: number;
  dashboard_file: number;
  latitude: string | null;
  longitude: string | null;

  cashbox_operator?: CashboxOperatorModelI & {
    operators?: EmployeeModelI;
  };
}
