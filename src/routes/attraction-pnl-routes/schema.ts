import { successAnswerTemplate } from "../schemas";

const monthPattern = "^[0-9]{4}-(0[1-9]|1[0-2])$";

const countProperties = {
  rounds_count: {
    type: "integer",
    description: "Finished physical rounds, counted once across promotions",
  },
  people_count: {
    type: "integer",
    description: "Net admissions across all card types, including VIP",
  },
  virtual_count: { type: "integer" },
  classic_count: { type: "integer" },
  vip_count: { type: "integer" },
  organization_count: { type: "integer" },
};

const monthlyTotalProperties = {
  ...countProperties,
  month: {
    type: "string",
    pattern: monthPattern,
  },
  total: {
    type: "number",
  },
};

export const getAttractionPnlSchema = {
  summary: "Get attraction monthly P&L revenue report",
  description:
    "Get confirmed attraction revenue excluding VIP usage, current attraction prices, finished round counts and net admissions by card type (including VIP), grouped by attraction and Tashkent calendar month. Counts are also summed for each attraction and the full period.",
  tags: ["Attraction P&L route"],
  headers: {
    type: "object",
    required: ["authorization"],
    additionalProperties: true,
    properties: {
      authorization: {
        type: "string",
        description: "Bearer access token",
      },
    },
  },
  querystring: {
    type: "object",
    required: ["start_month", "end_month"],
    additionalProperties: false,
    properties: {
      start_month: {
        type: "string",
        pattern: monthPattern,
        description: "First report month in YYYY-MM format",
      },
      end_month: {
        type: "string",
        pattern: monthPattern,
        description: "Last report month in YYYY-MM format",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      "attraction-pnl": {
        type: "object",
        additionalProperties: false,
        properties: {
          start_month: {
            type: "string",
            pattern: monthPattern,
          },
          end_month: {
            type: "string",
            pattern: monthPattern,
          },
          months: {
            type: "array",
            items: {
              type: "string",
              pattern: monthPattern,
            },
          },
          attractions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                price: {
                  type: ["number", "null"],
                  description: "Current attraction price; null for tariff-only attractions",
                },
                ...countProperties,
                months: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: monthlyTotalProperties,
                  },
                },
                total: { type: "number" },
              },
            },
          },
          totals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: monthlyTotalProperties,
            },
          },
          grand_total: {
            type: "number",
          },
          ...countProperties,
        },
      },
    }),
  },
};
