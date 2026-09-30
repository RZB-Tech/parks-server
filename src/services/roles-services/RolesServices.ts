import { RoleDTO } from "../../dtos/roles-dtos/EmployeeDto";
import { MAX_OWNER_EMPLOYEES } from "../../consts/employee";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { RoleTypes } from "../../models/postgresql/role-model/enums";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";

export const GetRolesService = async (): Promise<RoleResponseDTO[]> => {
  const roles = await RoleModel.findAll();
  const ownerRole = roles.find((role) => role.name === RoleTypes.OWNER);

  const ownerCount = ownerRole
    ? await EmployeeModel.count({
        where: { role: ownerRole.id },
        paranoid: false,
      })
    : 0;

  const rolesData = roles
    .filter(
      (role) =>
        role.name !== RoleTypes.OWNER || ownerCount < MAX_OWNER_EMPLOYEES,
    )
    .map((role) => RoleDTO(role));

  return rolesData;
};
