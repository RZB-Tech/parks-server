import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { successAnswerTemplate } from "../schemas";

export const attractionRoundProperties = {
  id: {
    type: "number",
  },
  report: {
    type: "number",
  },
  attraction: {
    type: "number",
  },
  operator: {
    type: "number",
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
  guest_count: {
    type: "number",
  },
  park_staff_count: {
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
  finished_at: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },

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
    "Get today open and closed rounds for current operator attraction",
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
  summary: "Close current attraction round",
  description:
    "Close current open round. finished_at is calculated from started_at plus attraction duration. Round data is added to attraction report totals.",
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
    required: ["attractionID", "roundID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
      },
      roundID: {
        type: "number",
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
