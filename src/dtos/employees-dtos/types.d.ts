declare interface EmployeeResponseDTO extends Omit<
  EmployeeModelI,
  "password"
> {}

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
