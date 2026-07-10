declare interface EmployeeShortCashboxDTO {
  id: number;
  name: string;
}

declare interface EmployeeShortAttractionDTO {
  id: number;
  name: string;
}

declare interface EmployeeResponseDTO extends Omit<EmployeeModelI, "password"> {
  attractions?: EmployeeShortAttractionDTO[];
  cashboxes?: EmployeeShortCashboxDTO[];
}

declare interface GetEmployeeDTO extends Omit<EmployeeModelI, "password"> {
  attractions?: EmployeeShortAttractionDTO[];
  cashboxes?: EmployeeShortCashboxDTO[];
}

declare interface EmployeesPaginationResponseDTO {
  employees: EmployeeResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare interface EmployeeStatusDTO {
  employees: number;
  active: number;
  inactive: number;
  vacation: number;
  fired: number;
}
