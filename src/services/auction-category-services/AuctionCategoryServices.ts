import { Op, WhereOptions } from "sequelize";
import { AuctionCategoryDTO } from "../../dtos/auction-category-dtos/AuctionCategoryDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AuctionCategoryModel, CardModel, sequelize } from "../../plugins/db/postgresql/db";

const normalizeData = (body: UpdateAuctionCategoryData): UpdateAuctionCategoryData => {
  const data: UpdateAuctionCategoryData = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 255) {
      throw BadRequest("Auction category name is invalid!");
    }
    data.name = body.name.trim();
  }
  if (body.price !== undefined) {
    if (!Number.isSafeInteger(body.price) || body.price <= 0) {
      throw BadRequest("Auction category price must be a positive safe integer in UZS!");
    }
    data.price = body.price;
  }
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      throw BadRequest("Auction category is_active must be a boolean!");
    }
    data.is_active = body.is_active;
  }

  return data;
};

const getCategoryID = (params: AuctionCategoryParams) => {
  const id = Number(params.categoryID);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw BadRequest("Auction category ID is invalid!");
  }
  return id;
};

export const GetAuctionCategoriesService = async (query: GetAuctionCategoriesQuery) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const where: WhereOptions = {};

  if (query.search?.trim()) {
    where.name = { [Op.iLike]: `%${query.search.trim()}%` };
  }
  if (query.is_active !== undefined) {
    where.is_active = query.is_active;
  }

  const { rows, count } = await AuctionCategoryModel.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["price", "ASC"], ["id", "ASC"]],
  });

  return {
    categories: rows.map(AuctionCategoryDTO),
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
};

export const GetAuctionCategoryService = async (params: AuctionCategoryParams) => {
  const category = await AuctionCategoryModel.findByPk(getCategoryID(params));
  if (!category) throw NotFound("Auction category not found!");
  return AuctionCategoryDTO(category);
};

export const CreateAuctionCategoryService = async (body: CreateAuctionCategoryData) => {
  const data = normalizeData(body);
  if (data.name === undefined || data.price === undefined) {
    throw BadRequest("Auction category name and price are required!");
  }
  const { name, price } = data;

  return sequelize.transaction(async (transaction) => {
    const category = await AuctionCategoryModel.create(
      { name, price, is_active: data.is_active ?? true },
      { transaction },
    );
    return AuctionCategoryDTO(category);
  });
};

export const UpdateAuctionCategoryService = async (
  params: AuctionCategoryParams,
  body: UpdateAuctionCategoryData,
) => {
  const id = getCategoryID(params);
  const data = normalizeData(body);
  if (Object.keys(data).length === 0) throw BadRequest("At least one category field is required!");

  return sequelize.transaction(async (transaction) => {
    const category = await AuctionCategoryModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!category) throw NotFound("Auction category not found!");
    await category.update(data, { transaction });
    return AuctionCategoryDTO(category);
  });
};

export const DeleteAuctionCategoryService = async (params: AuctionCategoryParams) => {
  const id = getCategoryID(params);

  return sequelize.transaction(async (transaction) => {
    const category = await AuctionCategoryModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!category) throw NotFound("Auction category not found!");
    const assignedCard = await CardModel.findOne({
      where: { auction_category_id: id },
      attributes: ["id"],
      paranoid: false,
      transaction,
    });
    if (assignedCard) throw Conflict("AUCTION_CATEGORY_HAS_CARDS");
    await category.destroy({ transaction });
    return true;
  });
};

export const GetClientAuctionCategoriesService = async () => {
  const categories = await AuctionCategoryModel.findAll({
    where: { is_active: true },
    order: [["price", "ASC"], ["id", "ASC"]],
  });
  return categories.map(AuctionCategoryDTO);
};
