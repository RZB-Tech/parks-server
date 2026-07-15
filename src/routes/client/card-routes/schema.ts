import {
  CardStatusTypes,
  CardType,
} from "../../../models/postgresql/cards-model/enums";
import { successAnswerTemplate } from "../../schemas";

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
