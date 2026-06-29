import { RoleDTO } from "../../dtos/roles-dtos/EmployeeDto";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";

export const GetRolesService = async (): Promise<RoleResponseDTO[]> => {
  const roles = await RoleModel.findAll();

  const rolesData = roles.map((role) => RoleDTO(role));
  return rolesData;
};
