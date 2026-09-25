import { PaymentCardType, PaymentType } from "../../models/postgresql/card-transactions-model/enums";
import { successAnswerTemplate } from "../schemas";

const authorizationHeaders = {
  type: "object",
  required: ["authorization"],
  additionalProperties: true,
  properties: {
    authorization: {
      type: "string",
      description: "Bearer access token",
    },
  },
};

const statisticsQuerystring = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "One calendar date in YYYY-MM-DD format",
    },
    from: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "Inclusive start date in YYYY-MM-DD format",
    },
    to: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "Inclusive end date in YYYY-MM-DD format",
    },
    sort: {
      type: "string",
      enum: ["asc", "desc"],
      default: "desc",
      description: "Sort amount ascending or descending",
    },
  },
};

const filterProperties = {
  date: { type: ["string", "null"] },
  from: { type: "string" },
  to: { type: "string" },
  sort: { type: "string", enum: ["asc", "desc"] },
  timezone: { type: "string", const: "Asia/Tashkent" },
};

const amountWithPercentageProperties = {
  amount: { type: "number" },
  percentage: { type: "number" },
};

const baseSchema = {
  headers: authorizationHeaders,
  querystring: statisticsQuerystring,
};

export const cashboxTurnoverStatisticsSchema = {
  ...baseSchema,
  summary: "Get cashbox turnover statistics",
  description:
    "Returns confirmed cashbox Z-report turnover grouped by cashbox for a date or an inclusive from/to range in Asia/Tashkent.",
  tags: ["Cashbox statistics route"],
  response: {
    200: successAnswerTemplate({
      cashbox_turnover: {
        type: "object",
        properties: {
          filter: { type: "object", properties: filterProperties },
          total_amount: { type: "number" },
          cashboxes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cashbox_id: { type: "number" },
                cashbox_name: { type: "string" },
                amount: { type: "number" },
                percentage: { type: "number" },
                report_count: { type: "number" },
              },
            },
          },
        },
      },
    }),
  },
};

export const paymentMethodsStatisticsSchema = {
  ...baseSchema,
  summary: "Get payment methods statistics",
  description:
    "Returns confirmed cashbox payment totals grouped by payment type, card type, and online service for a date or an inclusive from/to range in Asia/Tashkent.",
  tags: ["Cashbox statistics route"],
  response: {
    200: successAnswerTemplate({
      payment_methods: {
        type: "object",
        properties: {
          filter: { type: "object", properties: filterProperties },
          total_amount: { type: "number" },
          by_payment_type: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: Object.values(PaymentType) },
                ...amountWithPercentageProperties,
              },
            },
          },
          by_card_type: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: Object.values(PaymentCardType),
                },
                ...amountWithPercentageProperties,
              },
            },
          },
          by_online_service: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                ...amountWithPercentageProperties,
              },
            },
          },
        },
      },
    }),
  },
};
