import {
  CardTransactionType,
  PaymentCardType,
} from "../../../models/postgresql/card-transactions-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../../schemas";

const nullableIntegerSchema = {
  anyOf: [{ type: "number" }, { type: "null" }],
};

export const clientAttractionPaymentSchema = {
  tags: ["Clients|Transactions"],
  summary: "Pay for attraction",
  description:
    "Checks the current attraction round, available seats and selected card. Deducts the card balance when required, adds members to the round and creates a card transaction.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  params: {
    type: "object",
    additionalProperties: false,
    required: ["attractionID"],
    properties: {
      attractionID: {
        type: "integer",
        minimum: 1,
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["card", "membersCount", "totalAmount"],
    properties: {
      card: {
        type: "integer",
        minimum: 1,
        description: "User card ID",
      },
      membersCount: {
        type: "integer",
        minimum: 1,
        description: "Number of people joining the attraction round",
      },
      totalAmount: {
        type: "integer",
        minimum: 0,
        description:
          "Maximum amount confirmed by the client. The server recalculates and applies the current active promotion price.",
      },
      tariffID: {
        type: "integer",
        minimum: 1,
        description:
          "Required when the attraction uses tariff pricing; omit it for a single-price attraction.",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      paid: { type: "boolean" },
      message: { type: "string" },
      transaction: {
        type: "object",
        properties: {
          id: { type: "integer" },
          card: { type: "integer" },
          attraction: { type: "integer" },
          attraction_tariff: nullableIntegerSchema,
          tariff_name: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          type: { type: "string" },
          amount: { type: "number" },
          balance_before: { type: "number" },
          balance_after: { type: "number" },
          payment_type: { type: "string" },
          status: { type: "string" },
        },
      },
    }),
  },
};

export const getClientTransactionsSchema = {
  tags: ["Clients|Transactions"],
  summary: "Get client transaction history",
  description:
    "Returns payment, top-up and refund transactions for all user cards or one selected card within one required calendar month.",

  security: [
    {
      InitDataHeader: [],
    },
  ],

  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["month"],
    properties: {
      month: {
        type: "string",
        pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
        description: "Required month in YYYY-MM format. Example: 2026-07",
      },

      card: {
        type: "integer",
        minimum: 1,
        description:
          "Optional card ID. Omit this field to get transactions for all user cards.",
      },

      type: {
        type: "string",
        enum: [
          CardTransactionType.PAYMENT,
          CardTransactionType.TOPUP,
          CardTransactionType.REFUND,
        ],
        description:
          "Optional transaction type. Omit to get payment, top-up and refund transactions.",
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
        default: 20,
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            card: { type: "string" },
            type: { type: "string" },
            status: { type: "string" },
            balance: { type: "number" },
          },
        },
      },

      period: {
        type: "object",
        additionalProperties: false,
        required: ["month"],
        properties: {
          month: { type: "string" },
        },
      },

      summary: {
        type: "object",
        properties: {
          income: { type: "number" },
          expense: { type: "number" },
        },
      },

      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            type: {
              type: "string",
              enum: [
                CardTransactionType.PAYMENT,
                CardTransactionType.TOPUP,
                CardTransactionType.REFUND,
              ],
            },
            direction: {
              type: "string",
              enum: ["income", "expense"],
            },
            amount: { type: "number" },
            signed_amount: { type: "number" },
            balance_before: { type: "number" },
            balance_after: { type: "number" },
            payment_type: {
              anyOf: [{ type: "string" }, { type: "null" }],
            },
            payment_card_type: {
              anyOf: [
                {
                  type: "string",
                  enum: Object.values(PaymentCardType),
                },
                { type: "null" },
              ],
            },
            payment_service: {
              anyOf: [{ type: "string" }, { type: "null" }],
            },
            status: { type: "string" },
            people_count: {
              type: "integer",
              minimum: 0,
              description:
                "Number of people paid for in this attraction transaction.",
            },
            tariff: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                  },
                },
                { type: "null" },
              ],
            },
            card: {
              type: "object",
              properties: {
                id: { type: "integer" },
                card: { type: "string" },
                type: { type: "string" },
              },
            },

            cashbox: {
              anyOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                  },
                },
                { type: "null" },
              ],
            },

            attraction: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    main_file: nullableIntegerSchema,
                    size: { type: "number" },
                  },
                },
                { type: "null" },
              ],
            },
            round: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    round_number: { type: "integer" },
                  },
                },
                { type: "null" },
              ],
            },
            promotion: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    code: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    name: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    type: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    discount_percent: { type: "number" },
                    original_unit_price: { type: "number" },
                    sale_unit_price: { type: "number" },
                    original_amount: { type: "number" },
                    discount_amount: { type: "number" },
                  },
                },
                { type: "null" },
              ],
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },

      pagination: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          pages: { type: "integer" },
        },
      },
    }),
  },
};
