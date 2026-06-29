import { CategoryDTO } from "../../dtos/categoies-dtos/CategoryDto";
import { CategoryModel } from "../../models/postgresql/category-model/CategoryModel";

export const GetCategoriesService = async (): Promise<
  CategoryResponseDTO[]
> => {
  // : Promise<EmployeesPaginationResponseDTO>
  const categories = await CategoryModel.findAll();

  const categoriesData = categories.map((category) => CategoryDTO(category));
  return categoriesData;
};
