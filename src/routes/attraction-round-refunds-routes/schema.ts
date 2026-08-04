import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";
import {
  CardStatusTypes,
  CardType,
} from "../../models/postgresql/cards-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

const nullableDateTime = {
  oneOf: [
    {
      type: "string",
      format: "date-time",
    },
    {
      type: "null",
    },
  ],
};

const authorizationHeaders = {
  type: "object",
  required: ["authorization"],
  additionalProperties: true,
  properties: {
    authorization: {
      type: "string",
      description: "Bearer access token",
    },
  },
};

const attractionRoundRefundTransactionSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "number" },
        type: {
          type: "string",
          enum: Object.values(CardTransactionType),
        },
        status: {
          type: "string",
          enum: Object.values(CardTransactionStatusTypes),
        },
        amount: { type: "number" },
        people_count: { type: "number" },
        balance_before: { type: "number" },
        balance_after: { type: "number" },
        payment_type: {
          type: "string",
          enum: Object.values(PaymentType),
        },
        payment_card_type: {
          oneOf: [
            {
              type: "string",
              enum: Object.values(PaymentCardType),
            },
            { type: "null" },
          ],
        },
        payment_service_type: {
          oneOf: [
            {
              type: "string",
              enum: Object.values(PaymentServiceType),
            },
            { type: "null" },
          ],
        },
        promotion: nullableNumber,
        attraction_tariff: nullableNumber,
        tariff_name: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        created_at: nullableDateTime,
      },
    },
    { type: "null" },
  ],
};

const attractionRoundRefundListItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "number" },
    amount: { type: "number" },
    people_count: { type: "number" },
    description: { type: "string" },
    refunded_at: nullableDateTime,
    round: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "number" },
            round_number: { type: "number" },
            status: {
              type: "string",
              enum: Object.values(AttractionRoundStatusTypes),
            },
            started_at: {
              type: "string",
              format: "date-time",
            },
            finished_at: nullableDateTime,
          },
        },
        { type: "null" },
      ],
    },
    attraction: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "number" },
            name: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    operator: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "number" },
            firstname: { type: "string" },
            lastname: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    card: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "number" },
            card_number: { type: "string" },
            nfc: { type: "string" },
            type: {
              type: "string",
              enum: Object.values(CardType),
            },
            status: {
              type: "string",
              enum: Object.values(CardStatusTypes),
            },
          },
        },
        { type: "null" },
      ],
    },
    original_transaction: attractionRoundRefundTransactionSchema,
    refund_transaction: attractionRoundRefundTransactionSchema,
  },
};

export const getAttractionRoundRefundsSchema = {
  summary: "Get attraction round refunds",
  description:
    "Get round refunds by Tashkent date or date range, with optional attraction and card number filters.",
  tags: ["Attraction round refunds route"],
  headers: authorizationHeaders,
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "integer",
        minimum: 1,
      },
      card_number: {
        type: "string",
        minLength: 1,
      },
      date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
      from_date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
      to_date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
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
      "attraction-round-refunds": {
        type: "array",
        items: attractionRoundRefundListItemSchema,
      },
      pagination: {
        type: "object",
        additionalProperties: false,
        properties: {
          total: { type: "number" },
          page: { type: "number" },
          limit: { type: "number" },
          totalPages: { type: "number" },
        },
      },
    }),
  },
};

export const refundFinishedAttractionRoundSchema = {
  summary: "Refund finished attraction round transactions",
  description:
    "Refund one card's selected payment transactions after the round has been finished.",
  tags: ["Attraction round refunds route"],
  headers: authorizationHeaders,
  params: {
    type: "object",
    required: ["attractionID", "roundID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        minimum: 1,
      },
      roundID: {
        type: "number",
        minimum: 1,
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    required: ["card_id", "transactionIDs", "description"],
    additionalProperties: false,
    properties: {
      card_id: {
        type: "number",
        minimum: 1,
      },
      transactionIDs: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: {
          type: "number",
          minimum: 1,
        },
      },
      description: {
        type: "string",
        minLength: 3,
        maxLength: 500,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      "attraction-round-refund": {
        type: "object",
        additionalProperties: false,
        properties: {
          round: { type: "number" },
          attraction: { type: "number" },
          refunded_amount: { type: "number" },
          refunded_people: { type: "number" },
          original_transaction_ids: {
            type: "array",
            items: { type: "number" },
          },
          refund_transactions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "number" },
                original_transaction: { type: "number" },
                amount: { type: "number" },
                people_count: { type: "number" },
              },
            },
          },
          card: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "number" },
              balance_before: { type: "number" },
              balance_after: { type: "number" },
            },
          },
          description: { type: "string" },
        },
      },
    }),
  },
};
