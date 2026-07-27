import { successAnswerTemplate } from "../../schemas";

const nullableStringSchema = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

const nullableIntegerSchema = {
  anyOf: [{ type: "integer" }, { type: "null" }],
};

export const getClientAttractionsSchema = {
  tags: ["Clients|Attractions"],
  summary: "Get client attractions",
  description:
    "Returns all active attractions for the Telegram Mini App user. Price is the current active promotion price when available.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      age: {
        type: "integer",
        minimum: 0,
        description:
          "Returns attractions whose age limit is greater than or equal to this value.",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      attractions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            manufacturer: nullableStringSchema,
            category: nullableStringSchema,
            status: { type: "string" },
            dashboard_file: nullableIntegerSchema,
            main_file: nullableIntegerSchema,
            files: {
              type: "array",
              items: {
                type: "integer",
              },
            },
            sub_attraction_files: {
              type: "array",
              items: {
                type: "integer",
              },
            },
            latitude: { type: "string" },
            longitude: { type: "string" },
            original_price: {
              type: "integer",
              description:
                "Original unit price before the active promotion discount.",
            },
            price: {
              type: "integer",
              description:
                "Current payable unit price. Uses the active promotion discounted price when available.",
            },
            discount_percent: {
              type: "number",
              description:
                "Current active promotion discount percent, or zero when no promotion is active.",
            },
            duration: { type: "integer" },
            seats: { type: "integer" },
            age_limit: nullableIntegerSchema,
            min_height: nullableIntegerSchema,
            max_weight: nullableIntegerSchema,
            description: nullableStringSchema,
          },
        },
      },
    }),
  },
};
export const getClientAttractionRoundSchema = {
  tags: ["Clients|Attractions"],
  summary: "Get client attraction last round",
  description:
    "Returns attraction information, current payable price, last round number and available seats for the Telegram Mini App user.",

  security: [
    {
      InitDataHeader: [],
    },
  ],

  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "integer",
        minimum: 1,
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      attraction: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          original_price: {
            type: "integer",
            description:
              "Original unit price before the active promotion discount.",
          },
          price: {
            type: "integer",
            description:
              "Current payable unit price. Uses the active promotion discounted price when available.",
          },
          discount_percent: {
            type: "number",
            description:
              "Current active promotion discount percent, or zero when no promotion is active.",
          },
          promotion: {
            description:
              "The promotion currently active for this attraction, or null when no promotion is active.",
            anyOf: [
              {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  code: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string" },
                  discount_percent: { type: "number" },
                  original_price: { type: "integer" },
                  discounted_price: { type: "integer" },
                  started_at: {
                    type: "string",
                    format: "date-time",
                  },
                  ended_at: {
                    type: "string",
                    format: "date-time",
                  },
                },
              },
              { type: "null" },
            ],
          },
          main_file: nullableIntegerSchema,
          seats: { type: "integer" },
          available_seats: { type: "integer" },
          round: {
            anyOf: [
              {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  round_number: { type: "integer" },
                  total_seats: { type: "integer" },
                  occupied_seats: { type: "integer" },
                  available_seats: { type: "integer" },
                },
              },
              { type: "null" },
            ],
          },
        },
      },
    }),
  },
};
