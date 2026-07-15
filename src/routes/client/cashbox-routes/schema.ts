import { CashboxStatusTypes } from "../../../models/postgresql/cashbox-model/enums";
import { successAnswerTemplate } from "../../schemas";

const nullableStringSchema = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

export const getClientCashboxesSchema = {
  tags: ["Clients|Cashboxes"],
  summary: "Get client cashboxes",
  description: "Returns cashboxes excluding maintenance and closed statuses.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  response: {
    200: successAnswerTemplate({
      cashboxes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            place: nullableStringSchema,
            status: { type: "string" },
            description: nullableStringSchema,
            latitude: { type: "string" },
            longitude: { type: "string" },
          },
        },
      },
    }),
  },
};
