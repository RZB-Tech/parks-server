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
}

declare interface CashboxWithOperatorResponseDTO {
  id: number;
  device: number;
  name: string;
  place: string;
  status: string;
  description: string;

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
