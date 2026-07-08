import { Transaction } from "sequelize";
import { EmployeeModel } from "../models/postgresql/employees-model/EmployeeModel";
import { NotFound } from "../exceptions";
import { RoleModel } from "../models/postgresql/role-model/RoleModel";

export const IsSuperAdminService = async (
  operatorID: number,
  transaction?: Transaction,
) => {
  const employee = await EmployeeModel.findByPk(operatorID, {
    attributes: ["id", "role"],
    transaction,
  });

  if (!employee) {
    throw NotFound("Employee not found!");
  }

  const employeeData = employee.get({ plain: true }) as EmployeeModelI;

  const role = await RoleModel.findByPk(Number(employeeData.role), {
    attributes: ["id", "name"],
    transaction,
  });

  const roleName = role ? (role.get({ plain: true }) as RoleModelI).name : "";

  return roleName === "superadmin";
};
