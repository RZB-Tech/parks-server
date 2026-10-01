import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";

declare interface EmployeeParams {
  employeeID: number;
}

declare interface GetEmployeesQuery {
  search: string;
  roles: number;
  statuses: string;

  page?: number;
  limit?: number;
}

declare interface CreateEmployeeData
  extends Omit<EmployeeModelI, "id" | "nfc_hash" | "status"> {
  nfc?: string | null;
}

declare interface UpdateEmployeeData
  extends Partial<Omit<EmployeeModelI, "id" | "nfc_hash">> {
  nfc?: string | null;
}

declare interface DeleteEmployeesData {
  employeeIDs: Array<number>;
}
