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
  },
};

export const usersStatisticsSchema = {
  summary: "Get user age statistics",
  description:
    "Returns all registered users and users registered in the selected period, grouped by current age in Asia/Tashkent.",
  tags: ["Users route"],
  headers: authorizationHeaders,
  querystring: statisticsQuerystring,
  response: {
    200: successAnswerTemplate({
      user_statistics: {
        type: "object",
        additionalProperties: false,
        properties: {
          filter: {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: ["string", "null"] },
              from: { type: "string" },
              to: { type: "string" },
            },
          },
          groups: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                min_age: { type: "integer" },
                max_age: {
                  anyOf: [{ type: "integer" }, { type: "null" }],
                },
                total: { type: "integer" },
                added_in_period: { type: "integer" },
                percentage: { type: "number" },
              },
            },
          },
        },
      },
    }),
  },
};
