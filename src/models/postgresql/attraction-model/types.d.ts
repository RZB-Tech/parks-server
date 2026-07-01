declare interface AttractionModelI {
  id: number;
  device: number;
  name: string;
  manufacturer: string;
  category: number;
  status: import("./enums").AttractionStatusTypes;
  dashboard_file: number;
  main_file: number;
  files: Array<number>;
  price: number;
  duration: number;
  seats: number;
  age_limit: number;
  min_height: number;
  max_weight: number;
  description: string;

  attraction_operator?: AttractionOperatorModelI & {
    operators?: EmployeeModelI;
  };
}
