import { reqBodyWrapper, successAnswerTemplate } from "../schemas";
import { CardStatusTypes } from "../../models/postgresql/cards-model/enums";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentCardType,
  PaymentServiceType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";
import { UserStatusTypes } from "../../models/postgresql/client/user-model/enums";

const nullableEnum = (values: string[]) => ({
  oneOf: [
    {
      type: "string",
      enum: values,
    },
    {
      type: "null",
    },
  ],
});

const nullableString = {
  oneOf: [{ type: "string" }, { type: "null" }],
};

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

export const cardLastTransactionProperties = {
  id: {
    type: "number",
  },

  type: {
    type: "string",
    enum: Object.values(CardTransactionType),
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

  payment_type: nullableEnum(Object.values(PaymentType)),

  payment_card_type: nullableEnum(Object.values(PaymentCardType)),

  payment_service_type: nullableEnum(Object.values(PaymentServiceType)),

  status: {
    type: "string",
    enum: Object.values(CardTransactionStatusTypes),
  },

  created_at: {
    type: "string",
  },
};

export const checkNfcCardProperties = {
  id: {
    type: "number",
  },

  batch: {
    type: "string",
  },

  type: {
    type: "string",
  },

  card: {
    type: "string",
  },

  nfc: {
    type: "string",
  },

  status: {
    type: "string",
    enum: Object.values(CardStatusTypes),
  },

  imported_at: {
    type: "string",
  },

  activated_at: nullableString,

  balance: {
    type: "number",
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

  last_transaction: {
    oneOf: [
      {
        type: "object",
        properties: cardLastTransactionProperties,
      },
      {
        type: "null",
      },
    ],
  },
};

export const cardTransactionProperties = {
  id: {
    type: "number",
  },

  card: {
    type: "string",
  },

  card_number: {
    type: "string",
  },

  nfc: {
    type: "string",
  },

  type: {
    type: "string",
    enum: Object.values(CardTransactionType),
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

  payment_type: nullableEnum(Object.values(PaymentType)),
  payment_card_type: nullableEnum(Object.values(PaymentCardType)),
  payment_service_type: nullableEnum(Object.values(PaymentServiceType)),
  status: {
    type: "string",
    enum: Object.values(CardTransactionStatusTypes),
  },
  operator: {
    type: "number",
  },
  cashbox: nullableNumber,
  xreport: nullableNumber,
  created_at: {
    type: "string",
  },
};

export const cardTransactionHistoryCardProperties = {
  id: {
    type: "number",
  },

  card: {
    type: "string",
  },

  status: {
    type: "string",
    enum: Object.values(CardStatusTypes),
  },
};

export const cardTransactionHistoryOperatorProperties = {
  id: {
    type: "number",
  },

  firstname: {
    type: "string",
  },

  lastname: {
    type: "string",
  },

  file: nullableNumber,
};

export const cardTransactionHistoryProperties = {
  id: {
    type: "number",
  },

  card: {
    oneOf: [
      {
        type: "object",
        properties: cardTransactionHistoryCardProperties,
      },
      {
        type: "null",
      },
    ],
  },

  operator: {
    oneOf: [
      {
        type: "object",
        properties: cardTransactionHistoryOperatorProperties,
      },
      {
        type: "null",
      },
    ],
  },

  type: {
    type: "string",
    enum: Object.values(CardTransactionType),
  },

  payment_type: nullableEnum(Object.values(PaymentType)),

  payment_card_type: nullableEnum(Object.values(PaymentCardType)),

  payment_service_type: nullableEnum(Object.values(PaymentServiceType)),

  amount: {
    type: "number",
  },

  balance_before: {
    type: "number",
  },

  balance_after: {
    type: "number",
  },

  status: {
    type: "string",
    enum: Object.values(CardTransactionStatusTypes),
  },

  cashbox: {
    type: "number",
  },

  xreport: nullableNumber,

  created_at: {
    type: "string",
  },
};

export const checkNfcCardSchema = {
  summary: "Check NFC card",
  description:
    "Check NFC card and return card data with last transaction if exists",
  tags: ["Card Transactions route"],

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
    additionalProperties: false,
    required: ["type", "id"],
    properties: {
      type: {
        type: "string",
        enum: ["nfc", "card"],
        description: "Card search type",
        examples: ["nfc", "card"],
      },

      id: {
        type: "string",
        minLength: 1,
        description:
          "NFC ID when type is nfc, or card number when type is card",
        examples: ["04AABBCCDD"],
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      card: {
        type: "object",
        properties: checkNfcCardProperties,
      },
    }),
  },
};

export const cardTopUpTransactionSchema = {
  summary: "Top up NFC card",
  description: "Top up NFC card balance",
  tags: ["Card Transactions route"],

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
    required: ["type", "id", "amount", "payment_type"],
    additionalProperties: false,
    properties: {
      type: {
        type: "string",
        enum: ["nfc", "card"],
        description: "Card search type",
        examples: ["nfc", "card"],
      },

      id: {
        type: "string",
        minLength: 1,
        description:
          "NFC ID when type is nfc, or card number when type is card",
        examples: ["04AABBCCDD"],
      },

      amount: {
        type: "number",
        minimum: 1,
      },

      payment_type: {
        type: "string",
        enum: Object.values(PaymentType),
      },

      payment_card_type: nullableEnum(Object.values(PaymentCardType)),
      payment_service_type: nullableEnum(Object.values(PaymentServiceType)),
    },
  }),

  response: {
    200: successAnswerTemplate({
      transaction: {
        type: "object",
        properties: cardTransactionProperties,
      },
    }),
  },
};

export const getCardTransactionsSchema = {
  summary: "Get card transactions",
  description: "Get today's card transactions by cashbox",
  tags: ["Card Transactions route"],
  params: {
    type: "object",
    required: ["cashboxID"],
    additionalProperties: false,
    properties: {
      cashboxID: {
        type: "number",
        description: "Cashbox ID",
      },
    },
  },

  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      page: {
        type: "number",
        default: 1,
      },

      limit: {
        type: "number",
        default: 10,
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "cashbox-transactions": {
        type: "array",
        items: {
          type: "object",
          properties: {
            ...cardTransactionHistoryProperties,
          },
        },
      },

      pagination: {
        type: "object",
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

export const cardPaymentTransactionProperties = {
  ...cardTransactionProperties,

  payment_service_type: nullableEnum(Object.values(PaymentServiceType)),
};

export const cardPaymentResponseProperties = {
  paid: {
    type: "boolean",
  },

  message: {
    type: "string",
  },

  transaction: {
    oneOf: [
      {
        type: "object",
        properties: cardPaymentTransactionProperties,
      },
      {
        type: "null",
      },
    ],
  },
};

export const cardPaymentTransactionSchema = {
  summary: "Pay NFC card for attraction",
  description:
    "Withdraw money from NFC card for attraction. If payment succeeds, current attraction round and report counters are updated.",
  tags: ["Card Transactions route"],

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
    required: ["nfc", "attractionID"],
    additionalProperties: false,
    properties: {
      nfc: {
        type: "string",
      },

      attractionID: {
        type: "number",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      payment: {
        type: "object",
        properties: cardPaymentResponseProperties,
      },
    }),
  },
};
