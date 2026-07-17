declare interface CashboxEmployeeDTO {
  id: number;
  firstname: string;
  lastname: string;
  file: number | null;
}

declare interface CashboxResnponseDTO {
  id: number;
  name: string;
  place: string;
  status: string;
  description: string;
  main_file: number;
  dashboard_file: number;
  latitude: string | null;
  longitude: string | null;
}

declare interface CashboxWithOperatorResponseDTO {
  id: number;
  device: number;
  name: string;
  place: string;
  status: string;
  description: string;
  main_file: number;
  dashboard_file: number;
  latitude: string | null;
  longitude: string | null;

  operators: CashboxEmployeeDTO[] | null;
}

declare interface CashboxesStatusDto {
  cashboxes: number;
  active: number;
  inactive: number;
  stopped: number;
  maintenance: number;
  closed: number;
}
