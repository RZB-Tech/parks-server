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

const filterProperties = {
  date: { type: ["string", "null"] },
  from: { type: "string" },
  to: { type: "string" },
  timezone: { type: "string", const: "Asia/Tashkent" },
};

const totalsProperties = {
  rounds_count: { type: "number" },
  people_count: { type: "number" },
  refund_count: { type: "number" },
  offline_people_count: { type: "number" },
  online_people_count: { type: "number" },
  offline_percentage: { type: "number" },
  online_percentage: { type: "number" },
  total_amount: { type: "number" },
  revenue_amount: { type: "number" },
};

export const attractionStatisticsSchema = {
  summary: "Get attraction statistics",
  description:
    "Returns confirmed attraction Z-report statistics grouped by attraction for a date or an inclusive from/to range in Asia/Tashkent.",
  tags: ["Attraction statistics route"],
  headers: authorizationHeaders,
  querystring: statisticsQuerystring,
  response: {
    200: successAnswerTemplate({
      attraction_statistics: {
        type: "object",
        additionalProperties: false,
        properties: {
          filter: {
            type: "object",
            properties: filterProperties,
          },
          totals: {
            type: "object",
            properties: totalsProperties,
          },
          attractions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                attraction_id: { type: "number" },
                attraction_name: { type: "string" },
                revenue_amount: { type: "number" },
                total_amount: { type: "number" },
                revenue_percentage: { type: "number" },
                rounds_count: { type: "number" },
                people_count: { type: "number" },
                offline_people_count: { type: "number" },
                online_people_count: { type: "number" },
                offline_percentage: { type: "number" },
                online_percentage: { type: "number" },
                refund_count: { type: "number" },
              },
            },
          },
        },
      },
    }),
  },
};
