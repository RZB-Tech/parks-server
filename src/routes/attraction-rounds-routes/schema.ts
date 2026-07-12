import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { successAnswerTemplate } from "../schemas";

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

const nullableString = {
  oneOf: [{ type: "string" }, { type: "null" }],
};

export const attractionRoundOperatorProperties = {
  id: {
    type: "number",
  },

  firstname: {
    type: "string",
  },

  lastname: {
    type: "string",
  },

  phone_number: {
    type: "string",
  },

  telegram_username: {
    type: "string",
  },

  role: {
    type: "number",
  },

  status: {
    type: "string",
  },

  file: nullableNumber,
};

export const attractionRoundAttractionProperties = {
  id: {
    type: "number",
  },

  name: {
    type: "string",
  },

  manufacturer: {
    type: "string",
  },

  category: {
    type: "number",
  },

  status: {
    type: "string",
  },

  dashboard_file: nullableNumber,

  main_file: nullableNumber,

  files: {
    type: "array",
    items: {
      type: "number",
    },
  },

  price: {
    type: "number",
  },

  duration: {
    type: "number",
  },

  seats: {
    type: "number",
  },

  age_limit: nullableNumber,

  min_height: nullableNumber,

  max_weight: {
    type: "number",
  },

  description: {
    type: "string",
  },
};

export const attractionRoundProperties = {
  id: {
    type: "number",
  },

  report: {
    type: "number",
  },

  attraction: {
    oneOf: [
      {
        type: "number",
      },
      {
        type: "object",
        properties: attractionRoundAttractionProperties,
      },
      {
        type: "null",
      },
    ],
  },

  operator: {
    oneOf: [
      {
        type: "number",
      },
      {
        type: "object",
        properties: attractionRoundOperatorProperties,
      },
      {
        type: "null",
      },
    ],
  },

  round_number: {
    type: "number",
  },

  status: {
    type: "string",
    enum: Object.values(AttractionRoundStatusTypes),
  },

  people_count: {
    type: "number",
  },

  offline_count: {
    type: "number",
  },

  online_count: {
    type: "number",
  },

  vip_count: {
    type: "number",
  },

  organization_count: {
    type: "number",
  },

  paid_amount: {
    type: "number",
  },

  total_amount: {
    type: "number",
  },

  started_at: {
    type: "string",
  },

  finished_at: nullableString,

  created_at: {
    type: "string",
  },
};

export const getCurrentAttractionRoundSchema = {
  summary: "Get current attraction round",
  description: "Get current open round for current operator attraction",
  tags: ["Attraction rounds route"],

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

  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-round": {
        oneOf: [
          {
            type: "object",
            properties: attractionRoundProperties,
          },
          {
            type: "null",
          },
        ],
      },
    }),
  },
};

export const getTodayAttractionRoundsSchema = {
  summary: "Get today attraction rounds",
  description:
    "Get today open and finished rounds for current operator attraction",
  tags: ["Attraction rounds route"],

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

  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-rounds": {
        type: "array",
        items: {
          type: "object",
          properties: attractionRoundProperties,
        },
      },
    }),
  },
};

export const getTodayRoundsSchema = {
  summary: "Get today attraction rounds",
  description:
    "Get today open and finished rounds for current operator attraction",
  tags: ["Attraction rounds route"],

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

  response: {
    200: successAnswerTemplate({
      "attraction-rounds": {
        type: "array",
        items: {
          type: "object",
          properties: attractionRoundProperties,
        },
      },
    }),
  },
};

export const closeCurrentAttractionRoundSchema = {
  summary: "Close attraction round",
  description:
    "Close open round by round ID. finished_at is calculated from started_at plus attraction duration. Round data is added to X report and Z report totals.",
  tags: ["Attraction rounds route"],

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

  params: {
    type: "object",
    required: ["roundID"],
    additionalProperties: false,
    properties: {
      roundID: {
        type: "number",
        description: "Attraction round ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-round": {
        type: "object",
        properties: attractionRoundProperties,
      },
    }),
  },
};
