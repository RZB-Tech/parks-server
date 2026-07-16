import { CardStatusTypes } from "../../models/postgresql/cards-model/enums";
import { UserStatusTypes } from "../../models/postgresql/client/user-model/enums";
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
  type: {
    type: "string",
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
  balance: {
    type: "number",
    description: "Card balance",
  },
  user: {
    description: "User attached to the card",
    oneOf: [
      {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "User ID",
          },
          fullname: {
            type: "string",
            description: "User fullname",
          },
          phone_number: {
            type: "string",
            description: "User phone number",
            example: "998903152006",
          },
          status: {
            type: "string",
            enum: Object.values(UserStatusTypes),
            description: "User status",
          },
        },
      },
      {
        type: "null",
      },
    ],
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
  description:
    "Returns global card statistics, totals grouped by card type, and batch summaries",
  tags: ["Cards route"],
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
    additionalProperties: false,
    properties: {
      type: {
        type: "string",
        enum: ["classic", "vip", "organization", "virtual"],
        description:
          "Filter card statistics by card type. If omitted, statistics for all card types are returned.",
      },
      batch: {
        type: "number",
        description:
          "Filter card statistics by batch ID. If omitted, statistics for all batches are returned.",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      card_stats: {
        type: "object",
        properties: {
          totalBalance: {
            type: "number",
            example: 10000,
          },
          total: {
            type: "number",
            example: 126,
          },
          active: {
            type: "number",
            example: 9,
          },
          inactive: {
            type: "number",
            example: 117,
          },
          blocked: {
            type: "number",
            example: 0,
          },
          lost: {
            type: "number",
            example: 0,
          },
          frozen: {
            type: "number",
            example: 0,
          },
          tethered: {
            type: "number",
            example: 0,
          },

          types: {
            type: "object",
            description: "Total cards grouped by card type",
            additionalProperties: {
              type: "number",
            },
            example: {
              classic: 55,
              vip: 19,
              organization: 16,
            },
          },

          batches: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "name", "type", "total"],
              properties: {
                id: {
                  type: "number",
                  example: 1,
                },
                name: {
                  type: "string",
                  example: "part-yana-100",
                },
                type: {
                  type: "string",
                  example: "classic",
                },
                total: {
                  type: "number",
                  example: 100,
                },
              },
            },
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
    properties: {
      type: {
        type: "string",
        enum: ["classic", "vip", "organization", "virtual"],
        description:
          "Filter card statistics by card type. If omitted, statistics for all card types are returned.",
      },
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
  body: reqBodyWrapper({
    type: "object",
  }),
};

export const updateCardSchema = {
  summary: "Update card status",
  description: "Change card status and update batch counters",
  tags: ["Cards route"],
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
    properties: {
      status: {
        type: "string",
        enum: ["active", "inactive", "blocked", "lost", "frozen"],
        description: "New card status",
      },
      fullname: { type: "string", description: "Orziyev Farrux" },
      phone_number: {
        type: "string",
        description: "+998903152006 | 998903152006 | 903152006",
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
