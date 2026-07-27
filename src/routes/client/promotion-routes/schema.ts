import { successAnswerTemplate } from "../../schemas";

const nullableStringSchema = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

const nullableDateTimeSchema = {
  anyOf: [
    { type: "string", format: "date-time" },
    { type: "null" },
  ],
};

const nullableDateSchema = {
  anyOf: [{ type: "string", format: "date" }, { type: "null" }],
};

const clientPromotionResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    code: { type: "string" },
    name: { type: "string" },
    description: nullableStringSchema,
    type: { type: "string" },
    status: { type: "string" },
    discount_percent: { type: "number" },
    schedule: {
      type: "object",
      properties: {
        starts_at: nullableDateTimeSchema,
        ends_at: nullableDateTimeSchema,
        start_date: nullableDateSchema,
        end_date: nullableDateSchema,
        start_time: nullableStringSchema,
        end_time: nullableStringSchema,
        weekdays: {
          type: "array",
          items: { type: "integer" },
        },
      },
    },
    file: {
      anyOf: [{ type: "integer" }, { type: "null" }],
    },
    attractions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          original_price: { type: "number" },
          discounted_price: { type: "number" },
          sort_order: { type: "integer" },
        },
      },
    },
  },
};

export const getClientPromotionsSchema = {
  tags: ["Clients|Promotions"],
  summary: "Get client promotions",
  description:
    "Returns active and planned promotions with their attractions and discounted prices for the Telegram Mini App user.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  response: {
    200: successAnswerTemplate({
      promotions: {
        type: "array",
        items: clientPromotionResponseSchema,
      },
    }),
  },
};
