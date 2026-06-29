import { CardStatusTypes } from "../../models/postgresql/cards-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const cardProperties = {
  id: {
    type: "number",
    description: "Card ID",
  },
  batch: {
    type: "string",
    description: "Batch ID",
  },
  card: {
    type: "string",
    description: "Card number",
  },
  nfc: {
    type: "string",
    description: "NFC ID",
  },
  status: {
    type: "string",
    enum: Object.values(CardStatusTypes),
  },
  imported_at: {
    type: "string",
    description: "Import date",
  },
  activated_at: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },
};

export const getCardStatsSchema = {
  summary: "Get card statistics",
  description: "Returns card status statistics grouped by batch or globally",
  tags: ["Cards route"],
  // querystring: {
  //   type: "object",
  //   properties: {
  //     batch: {
  //       type: "number",
  //       description: "Filter by batch ID (optional)",
  //     },
  //   },
  // },

  response: {
    200: successAnswerTemplate({
      card_stats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            batch: { type: "number" },
            batchName: { type: "string" },
            total: { type: "number" },
            active: { type: "number" },
            inactive: { type: "number" },
            blocked: { type: "number" },
            lost: { type: "number" },
            frozen: { type: "number" },
            tethered: { type: "number" },
          },
        },
      },
    }),
  },
};

export const getCardsSchema = {
  summary: "Get cards",
  description: "Get cards by batch with filters",
  tags: ["Cards route"],

  querystring: {
    type: "object",
    required: ["batch"],
    properties: {
      batch: { type: "number" },
      search: {
        type: "string",
        description: "Search by card or NFC",
      },
      statuses: {
        type: "array",
        items: {
          type: "string",
          enum: Object.values(CardStatusTypes),
        },
        description: "Filter by status",
      },
      page: {
        type: "integer",
        minimum: 1,
        default: 1,
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: cardProperties,
        },
      },
      pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    }),
  },
};

export const uploadCardSchema = {
  summary: "Upload nfc card from xlslx",
  description: "Upload xls which creates new nfc cards",
  tags: ["Cards route"],

  body: reqBodyWrapper({
    type: "object",
  }),
};

export const updateCardSchema = {
  summary: "Update card status",
  description: "Change card status and update batch counters",
  tags: ["Cards route"],
  params: {
    type: "object",
    required: ["cardID"],
    properties: {
      cardID: {
        type: "number",
        description: "Card ID",
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["active", "inactive", "blocked", "lost", "frozen"],
        description: "New card status",
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      card: {
        type: "object",
        properties: {
          id: { type: "number" },
          status: { type: "string" },
        },
      },
    }),
  },
};

export const deleteCardsSchema = {
  summary: "Delete cards",
  description: "Delete cards",
  tags: ["Cards route"],
  body: reqBodyWrapper({
    type: "object",
    required: ["cardIDs"],
    additionalProperties: false,
    properties: {
      cardIDs: {
        type: "array",
        description: "Card IDs to delete",
        items: {
          type: "integer",
          minimum: 1,
        },
        minItems: 1,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};
