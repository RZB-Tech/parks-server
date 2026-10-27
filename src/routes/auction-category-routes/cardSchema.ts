import { AuctionCardStatus, CardStatusTypes, CardType } from "../../models/postgresql/cards-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";
import { auctionCategorySchema } from "./schema";

export const cardAuctionProperties = {
  is_auction: { type: "boolean" },
  auction_category_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
  auction_status: { anyOf: [{ type: "string", enum: Object.values(AuctionCardStatus) }, { type: "null" }] },
};

const auctionCardSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    card: { type: "string" },
    type: { type: "string", enum: Object.values(CardType) },
    status: { type: "string", enum: Object.values(CardStatusTypes) },
    balance: { type: "integer" },
    ...cardAuctionProperties,
  },
};

const baseSchema = {
  tags: ["Auction categories route"],
  description: "Only superadmin and director can manage auction cards.",
  security: [{ BearerAuth: [] }],
};

export const auctionCardsBody = reqBodyWrapper({
  type: "object",
  required: ["auctionCategoryID", "cards"],
  additionalProperties: false,
  properties: {
    auctionCategoryID: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    cards: {
      type: "array",
      minItems: 1,
      maxItems: 500,
      items: { type: "string", minLength: 1, maxLength: 255, pattern: "\\S" },
      description: "Card numbers as strings, preserving leading zeros. Entire batch succeeds or fails together.",
      examples: [["000123", "000456"]],
    },
  },
});

const cardsResponse = {
  200: successAnswerTemplate({ cards: { type: "array", items: auctionCardSchema } }),
};

export const assignAuctionCardsSchema = {
  ...baseSchema,
  summary: "Assign inactive, unbound cards to an active auction category",
  body: auctionCardsBody,
  response: cardsResponse,
};

export const removeAuctionCardsSchema = {
  ...baseSchema,
  summary: "Remove listed, unsold cards from an auction category",
  body: auctionCardsBody,
  response: cardsResponse,
};

export const auctionCardsQueryProperties = {
  search: { type: "string", maxLength: 255 },
  page: { type: "integer", minimum: 1, maximum: 1000000, default: 1 },
  limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
};

export const getAuctionCategoryCardsSchema = {
  ...baseSchema,
  summary: "Get cards in an auction category",
  params: {
    type: "object",
    required: ["categoryID"],
    properties: { categoryID: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER } },
  },
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      ...auctionCardsQueryProperties,
      auction_status: { type: "string", enum: Object.values(AuctionCardStatus) },
    },
  },
  response: {
    200: successAnswerTemplate({
      category: auctionCategorySchema,
      cards: { type: "array", items: auctionCardSchema },
      pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    }),
  },
};

export const getClientAuctionCategoryCardsSchema = {
  ...getAuctionCategoryCardsSchema,
  tags: ["Clients|Auction categories"],
  summary: "Get available cards in an active auction category",
  description: "Returns only listed, inactive, unbound cards. NFC and bind tokens are never exposed.",
  security: [{ InitDataHeader: [] }],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: auctionCardsQueryProperties,
  },
};
