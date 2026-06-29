export const RoleDTO = (role: RoleModelI): RoleResponseDTO => ({
  id: role.id,
  name: role.name,
});
