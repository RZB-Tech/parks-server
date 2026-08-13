import {
  CardStatusTypes,
  CardType,
} from "../../../models/postgresql/cards-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../../schemas";

export const getUserCardsSchema = {
  tags: ["Clients|Cards"],
  summary: "Get current user cards",
  description:
    "Returns cards linked to the current Telegram Mini App user and their total balance.",

  security: [
    {
      InitDataHeader: [],
    },
  ],

  response: {
    200: successAnswerTemplate({
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            card: { type: "string" },
            nfc: { type: "string" },
            status: {
              type: "string",
              enum: Object.values(CardStatusTypes),
            },
            type: {
              type: "string",
              enum: Object.values(CardType),
            },
            balance: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
      totalBalance: {
        type: "integer",
        minimum: 0,
        examples: [1000000],
      },
    }),
  },
};

export const createVirtualCardSchema = {
  tags: ["Clients|Cards"],
  summary: "Create virtual card to user",
  description: "Creating virtual cards for user",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  response: {
    200: successAnswerTemplate({
      card: {
        type: "object",
        properties: {
          id: { type: "integer" },
          card: { type: "string" },
          nfc: { type: "string" },
          status: {
            type: "string",
            enum: Object.values(CardStatusTypes),
          },
          type: {
            type: "string",
            enum: Object.values(CardType),
          },
          balance: {
            type: "integer",
            minimum: 0,
          },
        },
      },
    }),
  },
};

export const bindCardSchema = {
  tags: ["Clients|Cards"],
  summary: "Bind a physical card to the current user",
  description:
    "Binds an unassigned classic, VIP, or organization card using its card number and case-sensitive 5-character bind token.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  body: reqBodyWrapper({
    type: "object",
    required: ["card_number", "bind_token"],
    additionalProperties: false,
    properties: {
      card_number: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        examples: ["860012345678"],
      },
      bind_token: {
        type: "string",
        minLength: 5,
        maxLength: 5,
        pattern: "^[A-Za-z0-9]{5}$",
        examples: ["AB12d"],
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      card: {
        type: "object",
        properties: {
          id: { type: "integer" },
          card: { type: "string" },
          nfc: { type: "string" },
          status: {
            type: "string",
            enum: Object.values(CardStatusTypes),
          },
          type: {
            type: "string",
            enum: Object.values(CardType),
          },
          balance: {
            type: "integer",
            minimum: 0,
          },
        },
      },
    }),
  },
};
