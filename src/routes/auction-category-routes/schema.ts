import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

const editableProperties = {
  name: { type: "string", minLength: 1, maxLength: 255, pattern: "\\S", examples: ["Premium raqamlar"] },
  price: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER, description: "Fixed card sale price in UZS; separate from card balance", examples: [300000] },
  is_active: { type: "boolean" },
};

export const auctionCategorySchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    ...editableProperties,
  },
};

const baseSchema = {
  tags: ["Auction categories route"],
  description: "Only superadmin and director can manage auction categories.",
  security: [{ BearerAuth: [] }],
};

const categoryParams = {
  type: "object",
  required: ["categoryID"],
  properties: {
    categoryID: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  },
};

const categoryResponse = {
  200: successAnswerTemplate({ category: auctionCategorySchema }),
};

export const getAuctionCategoriesSchema = {
  ...baseSchema,
  summary: "Get auction categories",
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", maxLength: 255 },
      is_active: { type: "boolean" },
      page: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
  },
  response: {
    200: successAnswerTemplate({
      categories: { type: "array", items: auctionCategorySchema },
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

export const getAuctionCategorySchema = {
  ...baseSchema,
  summary: "Get auction category",
  params: categoryParams,
  response: categoryResponse,
};

export const createAuctionCategorySchema = {
  ...baseSchema,
  summary: "Create auction category",
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["name", "price"],
    properties: editableProperties,
  }),
  response: categoryResponse,
};

export const updateAuctionCategorySchema = {
  ...baseSchema,
  summary: "Update auction category",
  params: categoryParams,
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: editableProperties,
  }),
  response: categoryResponse,
};

export const deleteAuctionCategorySchema = {
  ...baseSchema,
  summary: "Soft delete auction category",
  params: categoryParams,
  response: {
    200: successAnswerTemplate({ success: { type: "boolean", const: true } }),
  },
};
