declare interface AttractionModelI {
  id: number;
  device: number | null;
  name: string;
  manufacturer: string;
  status: import("./enums").AttractionStatusTypes;
  dashboard_file: number;
  main_file: number;
  files: Array<number>;
  sub_attraction_files: Array<number>;
  size: number;
  latitude: string | null;
  longitude: string | null;
  price: number | null;
  duration: number;
  seats: number;
  age_limit: number;
  min_height: number;
  max_weight: number;
  description: string;

  attraction_operator?: Array<
    AttractionOperatorModelI & {
      operators?: EmployeeModelI;
    }
  >;
  tariffs?: AttractionTariffModelI[];
}
