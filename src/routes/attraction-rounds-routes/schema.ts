import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";

import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentType,
  PaymentCardType,
  PaymentServiceType,
} from "../../models/postgresql/card-transactions-model/enums";

import {
  CardStatusTypes,
  CardType,
} from "../../models/postgresql/cards-model/enums";

import { PromotionTypes } from "../../models/postgresql/promotion-model/enums";

import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

/*
|--------------------------------------------------------------------------
| COMMON NULLABLE SCHEMAS
|--------------------------------------------------------------------------
*/

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

const nullableString = {
  oneOf: [{ type: "string" }, { type: "null" }],
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

/*
|--------------------------------------------------------------------------
| ROUND OPERATOR
|--------------------------------------------------------------------------
*/

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

  telegram_username: nullableString,

  role: {
    type: "number",
  },

  status: {
    type: "string",
  },

  file: nullableNumber,
};

export const attractionRoundOperatorSchema = {
  type: "object",
  additionalProperties: false,
  properties: attractionRoundOperatorProperties,
};

/*
|--------------------------------------------------------------------------
| ROUND ATTRACTION
|--------------------------------------------------------------------------
*/

export const attractionRoundAttractionProperties = {
  id: {
    type: "number",
  },

  name: {
    type: "string",
  },

  manufacturer: nullableString,

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

  max_weight: nullableNumber,

  description: nullableString,
};

export const attractionRoundAttractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: attractionRoundAttractionProperties,
};

/*
|--------------------------------------------------------------------------
| TRANSACTION CARD
|--------------------------------------------------------------------------
*/

export const attractionRoundTransactionCardProperties = {
  id: {
    type: "number",
  },

  card: {
    type: "string",
  },

  nfc: {
    type: "string",
  },

  type: {
    type: "string",
    enum: Object.values(CardType),
  },

  status: {
    type: "string",
    enum: Object.values(CardStatusTypes),
  },

  balance: {
    type: "number",
  },
};

export const attractionRoundTransactionCardSchema = {
  type: "object",

  required: ["id", "card", "nfc", "type", "status", "balance"],

  additionalProperties: false,

  properties: attractionRoundTransactionCardProperties,
};

export const attractionRoundTransactionCardIDSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,

  properties: {
    id: {
      type: "number",
    },
  },
};

/*
|--------------------------------------------------------------------------
| ROUND TRANSACTION
|--------------------------------------------------------------------------
*/

export const attractionRoundTransactionProperties = {
  id: {
    type: "number",
  },

  transaction_type: {
    type: "string",
    enum: Object.values(CardTransactionType),
  },

  payment_source: {
    type: "string",
    enum: ["operator", "client"],
  },

  operator: nullableNumber,

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
      {
        type: "null",
      },
    ],
  },

  payment_service: {
    oneOf: [
      {
        type: "string",
        enum: Object.values(PaymentServiceType),
      },
      {
        type: "null",
      },
    ],
  },

  people_count: {
    type: "number",
  },

  amount: {
    type: "number",
  },

  balance_before: {
    type: "number",
  },

  balance_after: {
    type: "number",
  },

  promotion: nullableNumber,

  promotion_code: nullableString,

  promotion_name: {
    type: "string",
  },

  promotion_type: {
    oneOf: [
      {
        type: "string",
        enum: Object.values(PromotionTypes),
      },
      {
        type: "null",
      },
    ],
  },

  discount_percent: {
    type: "number",
  },

  original_unit_price: {
    type: "number",
  },

  sale_unit_price: {
    type: "number",
  },

  original_amount: {
    type: "number",
  },

  discount_amount: {
    type: "number",
  },

  card: {
    oneOf: [
      attractionRoundTransactionCardSchema,
      attractionRoundTransactionCardIDSchema,
    ],
  },

  created_at: nullableDateTime,
};

export const attractionRoundTransactionSchema = {
  type: "object",
  additionalProperties: false,
  properties: attractionRoundTransactionProperties,
};

/*
|--------------------------------------------------------------------------
| ATTRACTION ROUND
|--------------------------------------------------------------------------
*/

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
      attractionRoundAttractionSchema,
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
      attractionRoundOperatorSchema,
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

  /*
   * Payment source counters.
   */
  offline_count: {
    type: "number",
  },

  online_count: {
    type: "number",
  },

  /*
   * Card type counters.
   */
  virtual_count: {
    type: "number",
  },

  classic_count: {
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
    format: "date-time",
  },

  finished_at: nullableDateTime,

  created_at: nullableDateTime,

  transactions: {
    type: "array",
    items: attractionRoundTransactionSchema,
  },
};

export const attractionRoundSchema = {
  type: "object",
  additionalProperties: false,
  properties: attractionRoundProperties,
};

/*
|--------------------------------------------------------------------------
| GET CURRENT ROUND
|--------------------------------------------------------------------------
*/

export const getCurrentAttractionRoundSchema = {
  summary: "Get current attraction round",

  description:
    "Get current open round with accumulated counters and payment transactions for current operator attraction.",

  tags: ["Attraction rounds route"],

  headers: authorizationHeaders,

  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,

    properties: {
      attractionID: {
        type: "number",
        minimum: 1,
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-round": {
        oneOf: [
          attractionRoundSchema,
          {
            type: "null",
          },
        ],
      },
    }),
  },
};

/*
|--------------------------------------------------------------------------
| GET TODAY CURRENT OPERATOR ATTRACTION ROUNDS
|--------------------------------------------------------------------------
*/

export const getTodayAttractionRoundsSchema = {
  summary: "Get today attraction rounds",

  description:
    "Get today's open and finished rounds with payment transactions for current operator and selected attraction.",

  tags: ["Attraction rounds route"],

  headers: authorizationHeaders,

  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,

    properties: {
      attractionID: {
        type: "number",
        minimum: 1,
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-rounds": {
        type: "array",
        items: attractionRoundSchema,
      },
    }),
  },
};

/*
|--------------------------------------------------------------------------
| GET TODAY ALL ROUNDS
|--------------------------------------------------------------------------
*/

export const getTodayRoundsSchema = {
  summary: "Get all today attraction rounds",

  description:
    "Get today's open and finished rounds for all attractions with operator, attraction and payment transaction details.",

  tags: ["Attraction rounds route"],

  headers: authorizationHeaders,

  response: {
    200: successAnswerTemplate({
      "attraction-rounds": {
        type: "array",
        items: attractionRoundSchema,
      },
    }),
  },
};

/*
|--------------------------------------------------------------------------
| CLOSE CURRENT ROUND
|--------------------------------------------------------------------------
*/

export const closeCurrentAttractionRoundSchema = {
  summary: "Close attraction round",

  description:
    "Close an open attraction round by round ID and set its finished time.",

  tags: ["Attraction rounds route"],

  headers: authorizationHeaders,

  params: {
    type: "object",
    required: ["roundID"],
    additionalProperties: false,

    properties: {
      roundID: {
        type: "number",
        minimum: 1,
        description: "Attraction round ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-round": attractionRoundSchema,
    }),
  },
};

/*
|--------------------------------------------------------------------------
| REFUND FINISHED ROUND TRANSACTIONS
|--------------------------------------------------------------------------
*/

export const refundFinishedAttractionRoundSchema = {
  summary: "Refund finished attraction round transactions",

  description:
    "Refund one card's selected payment transactions after the round has been finished.",

  tags: ["Attraction rounds route"],

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

/*
|--------------------------------------------------------------------------
| GET ROUND REFUNDS
|--------------------------------------------------------------------------
*/

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
  tags: ["Attraction rounds route"],
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
