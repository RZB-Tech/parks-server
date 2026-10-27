import { AuctionCategoryModel } from "../../models/postgresql/auction-category-model/AuctionCategoryModel";

export const AuctionCategoryDTO = (category: AuctionCategoryModel) => ({
  id: Number(category.id),
  name: category.name,
  price: Number(category.price),
  is_active: category.is_active,
});
