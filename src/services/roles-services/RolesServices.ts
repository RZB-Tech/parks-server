import { RoleDTO } from "../../dtos/roles-dtos/EmployeeDto";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { RoleTypes } from "../../models/postgresql/role-model/enums";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";

export const GetRolesService = async (): Promise<RoleResponseDTO[]> => {
  const roles = await RoleModel.findAll();
  const ownerRole = roles.find((role) => role.name === RoleTypes.OWNER);

  const ownerExists = ownerRole
    ? (await EmployeeModel.count({
        where: { role: ownerRole.id },
        paranoid: false,
      })) > 0
    : false;

  const rolesData = roles
    .filter((role) => !ownerExists || role.name !== RoleTypes.OWNER)
    .map((role) => RoleDTO(role));

  return rolesData;
};
