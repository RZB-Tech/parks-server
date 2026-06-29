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

declare interface CreateEmployeeData extends Omit<EmployeeModelI, "id"> {}

declare interface UpdateEmployeeData extends Omit<EmployeeModelI, "id"> {}

declare interface DeleteEmployeesData {
  employeeIDs: Array<number>;
}
