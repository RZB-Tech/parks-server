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
  description: "Returns all active attractions for the Telegram Mini App user.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
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
            price: { type: "integer" },
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
    "Returns attraction information, last round number and available seats for the Telegram Mini App user.",

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
          price: { type: "integer" },
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
                  people_count: { type: "integer" },
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
