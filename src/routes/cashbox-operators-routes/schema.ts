import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const cashboxOperatorEmployeeProperties = {
  id: {
    type: "number",
  },
  firstname: {
    type: "string",
  },
  lastname: {
    type: "string",
  },
  file: {
    oneOf: [{ type: "number" }, { type: "null" }],
  },
};

export const cashboxOperatorProperties = {
  id: {
    type: "number",
  },

  cashbox: {
    type: "number",
  },

  status: {
    type: "string",
    enum: Object.values(CashboxOperatorStatusTypes),
  },

  operator: {
    oneOf: [
      {
        type: "object",
        properties: cashboxOperatorEmployeeProperties,
      },
      {
        type: "null",
      },
    ],
  },
};

export const cashboxOperatorCashboxProperties = {
  id: {
    type: "number",
  },

  cashboxName: {
    type: "string",
  },

  place: {
    type: "string",
  },

  status: {
    type: "string",
    enum: Object.values(CashboxStatusTypes),
  },
};

export const createCashboxOperatorsSchema = {
  summary: "Create cashbox operators",
  description:
    "Create cashbox operators superadmin, head_marketing, head_cashier",
  tags: ["Cashboxes operators route"],
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
  body: reqBodyWrapper({
    type: "object",
    required: ["operator"],
    additionalProperties: false,
    properties: {
      operator: { type: "number" },
    },
  }),
  response: {
    200: successAnswerTemplate({
      "cashbox-operator": {
        type: "object",
        properties: cashboxOperatorProperties,
      },
    }),
  },
};

export const deleteCashboxOperatorsSchema = {
  summary: "Delete cashbox operators",
  description:
    "Delete cashbox operators superadmin, head_marketing, head_cashier",
  tags: ["Cashboxes operators route"],
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
  params: {
    type: "object",
    required: ["cashboxID", "operatorID"],
    additionalProperties: false,
    properties: {
      cashboxID: {
        type: "number",
        description: "Cashbox ID",
      },
      operatorID: {
        type: "number",
        description: "Operator ID",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};
