import { PaymentOrderStatusTypes } from "../../../models/postgresql/payment-orders-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../../schemas";

export const createClientPaymeOrderSchema = {
  tags: ["Clients|Payments"],
  summary: "Create Payme card top-up order",
  description:
    "Creates or reuses a pending card top-up order and returns the Payme checkout URL.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["card", "amount"],
    properties: {
      card: {
        type: "integer",
        minimum: 1,
        description: "User card ID",
      },
      amount: {
        type: "integer",
        minimum: 1,
        description: "Amount credited to the card balance in UZS",
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      payment: {
        type: "object",
        required: ["order_id", "amount", "status", "checkout_url"],
        properties: {
          order_id: { type: "string" },
          amount: { type: "integer" },
          status: {
            type: "string",
            enum: Object.values(PaymentOrderStatusTypes),
          },
          checkout_url: { type: "string" },
        },
      },
    }),
  },
};

export const createClientClickOrderSchema = {
  ...createClientPaymeOrderSchema,
  summary: "Create Click card top-up order",
  description:
    "Creates or reuses a pending card top-up order and returns the Click checkout URL.",
};
