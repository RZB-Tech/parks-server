import { successAnswerTemplate } from "../../schemas";

export const newsResponseSchema = {
  type: "object",

  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    description: { type: "string" },
    image: {
      anyOf: [{ type: "integer" }, { type: "null" }],
    },
    publish_at: {
      type: "string",
      format: "date-time",
    },
    expired_at: {
      type: "string",
      format: "date-time",
    },
  },
};

export const clientGetAllNewsSchema = {
  tags: ["Clients|News"],
  summary: "Get all news",
  description: "Returns all news.",
  security: [
    {
      BearerAuth: [],
    },
  ],
  response: {
    200: successAnswerTemplate({
      news: {
        type: "array",
        items: newsResponseSchema,
      },
    }),
  },
};

export const clientGetNewsSchema = {
  tags: ["Clients|News"],
  summary: "Get one news",
  description: "Returns one news item by news ID.",
  security: [
    {
      BearerAuth: [],
    },
  ],
  params: {
    type: "object",
    required: ["newsID"],
    additionalProperties: false,
    properties: {
      newsID: {
        type: "integer",
        minimum: 1,
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      news: newsResponseSchema,
    }),
  },
};
