import { Op, WhereOptions } from "sequelize";
import { AuctionCategoryDTO } from "../../dtos/auction-category-dtos/AuctionCategoryDto";
import { AuctionCardDTO } from "../../dtos/auction-category-dtos/AuctionCardDto";
import { BadRequest, NotFound } from "../../exceptions";
import { AuctionCardStatus, CardStatusTypes } from "../../models/postgresql/cards-model/enums";
import { AuctionCategoryModel, CardModel, sequelize } from "../../plugins/db/postgresql/db";

const categoryID = (value: number) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw BadRequest("INVALID_AUCTION_CATEGORY_ID");
  return id;
};

const cardNumbers = (cards: string[]) => {
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > 500) {
    throw BadRequest("CARDS_MUST_CONTAIN_1_TO_500_CARD_NUMBERS");
  }
  const seen = new Set<string>();
  const errors: { card: unknown; code: string; index: number }[] = [];
  const numbers = cards.map((value, index) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 255) {
      errors.push({ card: value, code: "INVALID_CARD_NUMBER", index });
      return "";
    }
    const number = value.trim();
    if (seen.has(number)) errors.push({ card: number, code: "DUPLICATE_CARD_NUMBER", index });
    seen.add(number);
    return number;
  });
  if (errors.length) throw BadRequest("AUCTION_CARDS_VALIDATION_FAILED", errors);
  return numbers;
};

const changeAuctionCards = async (body: AuctionCategoryCardsData, remove: boolean) => {
  const id = categoryID(body.auctionCategoryID);
  const numbers = cardNumbers(body.cards);

  return sequelize.transaction(async (transaction) => {
    // Serialize assignment, removal and category deletion using the same order:
    // category first, then cards in ID order.
    const category = await AuctionCategoryModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!category) throw NotFound("Auction category not found!");
    if (!remove && !category.is_active) throw BadRequest("AUCTION_CATEGORY_IS_INACTIVE");

    const cards = await CardModel.findAll({
      where: { card: { [Op.in]: numbers } },
      order: [["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const byNumber = new Map(cards.map((card) => [card.card, card]));
    const errors: { card: string; code: string }[] = [];

    for (const number of numbers) {
      const card = byNumber.get(number);
      if (!card) {
        errors.push({ card: number, code: "CARD_NOT_FOUND" });
        continue;
      }
      if (card.status !== CardStatusTypes.INACTIVE) {
        errors.push({ card: number, code: "CARD_NOT_INACTIVE" });
      }
      if (card.user != null) errors.push({ card: number, code: "CARD_ALREADY_BOUND" });
      if (remove) {
        if (Number(card.auction_category_id) !== id) {
          errors.push({ card: number, code: "CARD_NOT_IN_THIS_AUCTION_CATEGORY" });
        }
        if (card.auction_status !== AuctionCardStatus.LISTED) {
          errors.push({ card: number, code: "ONLY_LISTED_CARDS_CAN_BE_REMOVED" });
        }
      } else if (card.auction_category_id != null || card.auction_status != null) {
        errors.push({ card: number, code: "CARD_ALREADY_IN_AUCTION" });
      }
    }

    // Validate the entire batch before performing any writes.
    if (errors.length) throw BadRequest("AUCTION_CARDS_VALIDATION_FAILED", errors);
    for (const card of cards) {
      await card.update(
        {
          auction_category_id: remove ? null : id,
          auction_status: remove ? null : AuctionCardStatus.LISTED,
        },
        { transaction },
      );
    }

    return numbers.map((number) => AuctionCardDTO(byNumber.get(number)!));
  });
};

export const AssignAuctionCardsService = (body: AuctionCategoryCardsData) => changeAuctionCards(body, false);
export const RemoveAuctionCardsService = (body: AuctionCategoryCardsData) => changeAuctionCards(body, true);

export const GetAuctionCategoryCardsService = async (
  params: AuctionCategoryParams,
  query: GetAuctionCategoryCardsQuery,
  client = false,
) => {
  const category = await AuctionCategoryModel.findByPk(categoryID(params.categoryID));
  if (!category || (client && !category.is_active)) throw NotFound("Auction category not found!");

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const where: WhereOptions = { auction_category_id: category.id };
  if (query.search?.trim()) where.card = { [Op.iLike]: `%${query.search.trim()}%` };
  if (client) {
    where.auction_status = AuctionCardStatus.LISTED;
    where.status = CardStatusTypes.INACTIVE;
    where.user = null;
  } else if (query.auction_status) {
    where.auction_status = query.auction_status;
  }

  const { rows, count } = await CardModel.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["card", "ASC"], ["id", "ASC"]],
  });
  return {
    category: AuctionCategoryDTO(category),
    cards: rows.map(AuctionCardDTO),
    pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  };
};
