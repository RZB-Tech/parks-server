export const uzumCallbackSchema = {
  tags: ["Payments|Uzum"],
  summary: "Receive Uzum Checkout callback",
  description:
    "Receives an Uzum payment event and verifies its status through the Uzum server-to-server API before changing the card balance.",
  body: {
    type: "object",
    additionalProperties: true,
    required: ["orderId", "operationState", "operationType", "orderNumber"],
    properties: {
      orderId: { type: "string", minLength: 1, maxLength: 64 },
      operationState: { type: "string", minLength: 1, maxLength: 64 },
      operationType: { type: "string", minLength: 1, maxLength: 64 },
      merchantOperationId: { type: "string", maxLength: 64 },
      orderNumber: { type: "string", minLength: 1, maxLength: 36 },
      rrn: { type: "string", maxLength: 64 },
      cardType: { type: "integer" },
      bindingId: { type: "string", maxLength: 128 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["ok"],
      properties: { ok: { type: "boolean", const: true } },
    },
  },
};
