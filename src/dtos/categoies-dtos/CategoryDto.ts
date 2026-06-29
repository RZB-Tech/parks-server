export const CategoryDTO = (
  data: CategoryResponseDTO,
): CategoryResponseDTO => ({
  id: data.id,
  name: data.name,
  icon: data.icon,
  color: data.color,
});
