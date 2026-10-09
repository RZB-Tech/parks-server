const merchantDataSchema = {
  type: "object",
  additionalProperties: {
    type: "object",
    required: ["value"],
    properties: {
      value: { type: "string" },
    },
  },
};

const baseRequestProperties = {
  serviceId: { type: "integer", minimum: 1 },
  timestamp: { type: "integer", minimum: 1 },
};

const transIdSchema = {
  type: "string",
  format: "uuid",
};

const errorResponseSchema = {
  type: "object",
  required: ["status", "errorCode"],
  additionalProperties: true,
  properties: {
    serviceId: { type: "integer" },
    transId: { type: "string" },
    status: { type: "string", const: "FAILED" },
    errorCode: { type: "string", pattern: "^[0-9]{5}$" },
    timestamp: { type: "integer" },
    transTime: { type: "integer" },
    confirmTime: { anyOf: [{ type: "integer" }, { type: "null" }] },
    reverseTime: { anyOf: [{ type: "integer" }, { type: "null" }] },
  },
};

const merchantSchema = (
  summary: string,
  description: string,
  body: Record<string, unknown>,
  successResponse: Record<string, unknown>,
) => ({
  tags: ["Payments|Uzum Merchant"],
  summary,
  description,
  security: [],
  body,
  response: {
    200: successResponse,
    400: errorResponseSchema,
  },
});

export const uzumCheckSchema = merchantSchema(
  "Check Uzum payment",
  "Checks whether a card top-up order can be paid through Uzum Merchant API.",
  {
    type: "object",
    required: ["serviceId", "timestamp", "params"],
    additionalProperties: false,
    properties: {
      ...baseRequestProperties,
      params: {
        type: "object",
        additionalProperties: {
          anyOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
          ],
        },
      },
    },
  },
  {
    type: "object",
    required: ["serviceId", "timestamp", "status", "data"],
    properties: {
      serviceId: { type: "integer" },
      timestamp: { type: "integer" },
      status: { type: "string", const: "OK" },
      data: merchantDataSchema,
    },
  },
);

export const uzumCreateSchema = merchantSchema(
  "Create Uzum payment transaction",
  "Creates a local transaction for an Uzum transId and validates the amount in tiyin.",
  {
    type: "object",
    required: ["serviceId", "timestamp", "transId", "params", "amount"],
    additionalProperties: false,
    properties: {
      ...baseRequestProperties,
      transId: transIdSchema,
      params: {
        type: "object",
        additionalProperties: {
          anyOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
          ],
        },
      },
      amount: {
        type: "integer",
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
        description: "Payment amount in tiyin",
      },
    },
  },
  {
    type: "object",
    required: [
      "serviceId",
      "transId",
      "status",
      "transTime",
      "data",
      "amount",
    ],
    properties: {
      serviceId: { type: "integer" },
      transId: { type: "string" },
      status: { type: "string", const: "CREATED" },
      transTime: { type: "integer" },
      data: merchantDataSchema,
      amount: { type: "integer" },
    },
  },
);

export const uzumConfirmSchema = merchantSchema(
  "Confirm Uzum payment transaction",
  "Atomically credits the card balance and confirms the Uzum transaction.",
  {
    type: "object",
    required: [
      "serviceId",
      "timestamp",
      "transId",
      "paymentSource",
      "phone",
    ],
    additionalProperties: false,
    properties: {
      ...baseRequestProperties,
      transId: transIdSchema,
      paymentSource: { type: "string", minLength: 1, maxLength: 64 },
      tariff: {
        anyOf: [
          { type: "string", maxLength: 64 },
          { type: "null" },
        ],
      },
      processingReferenceNumber: {
        anyOf: [
          { type: "string", maxLength: 128 },
          { type: "null" },
        ],
      },
      phone: { type: "string", minLength: 1, maxLength: 32 },
      cardType: {
        anyOf: [{ type: "integer" }, { type: "null" }],
      },
    },
  },
  {
    type: "object",
    required: [
      "serviceId",
      "transId",
      "status",
      "confirmTime",
      "data",
      "amount",
    ],
    properties: {
      serviceId: { type: "integer" },
      transId: { type: "string" },
      status: { type: "string", const: "CONFIRMED" },
      confirmTime: { type: "integer" },
      data: merchantDataSchema,
      amount: { type: "integer" },
    },
  },
);

const transactionLookupBody = {
  type: "object",
  required: ["serviceId", "timestamp", "transId"],
  additionalProperties: false,
  properties: {
    ...baseRequestProperties,
    transId: transIdSchema,
  },
};

export const uzumReverseSchema = merchantSchema(
  "Reverse Uzum payment transaction",
  "Reverses a created transaction or refunds a confirmed card top-up.",
  transactionLookupBody,
  {
    type: "object",
    required: [
      "serviceId",
      "transId",
      "status",
      "reverseTime",
      "data",
      "amount",
    ],
    properties: {
      serviceId: { type: "integer" },
      transId: { type: "string" },
      status: { type: "string", const: "REVERSED" },
      reverseTime: { type: "integer" },
      data: merchantDataSchema,
      amount: { type: "integer" },
    },
  },
);

export const uzumStatusSchema = merchantSchema(
  "Get Uzum payment transaction status",
  "Returns the authoritative local status and transaction timestamps.",
  transactionLookupBody,
  {
    type: "object",
    required: [
      "serviceId",
      "transId",
      "status",
      "transTime",
      "confirmTime",
      "reverseTime",
      "data",
      "amount",
    ],
    properties: {
      serviceId: { type: "integer" },
      transId: { type: "string" },
      status: {
        type: "string",
        enum: ["CREATED", "CONFIRMED", "REVERSED"],
      },
      transTime: { type: "integer" },
      confirmTime: { anyOf: [{ type: "integer" }, { type: "null" }] },
      reverseTime: { anyOf: [{ type: "integer" }, { type: "null" }] },
      data: merchantDataSchema,
      amount: { type: "integer" },
    },
  },
);
