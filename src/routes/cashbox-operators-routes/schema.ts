import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";
import {
  employee_id,
  getSchemaHeaders,
  reqBodyWrapper,
  successAnswerTemplate,
} from "../schemas";

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

export const cashboxOperatorCashierProperties = {
  firstname: { type: "string" },
  lastname: { type: "string" },
  fullname: { type: "string" },
  file: {
    oneOf: [{ type: "number" }, { type: "null" }],
  },
  phone_number: { type: "string" },
  telegram_username: { type: "string" },
  createdAt: { type: "string" },
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

export const currentCashboxOperatorProperties = {
  id: {
    type: "number",
  },

  status: {
    type: "string",
    enum: Object.values(CashboxOperatorStatusTypes),
  },

  endAt: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },
  ...cashboxOperatorCashierProperties,

  cashbox: {
    oneOf: [
      {
        type: "object",
        properties: cashboxOperatorCashboxProperties,
      },
      {
        type: "null",
      },
    ],
  },
};

export const getCashboxOperatorByEmployeeSchema = {
  summary: "Get cashbox operator by employee",
  description: "Get current cashbox operator by employee id from headers",
  tags: ["Cashboxes operators route"],

  response: {
    200: successAnswerTemplate({
      "cashbox-operator": {
        type: "object",
        properties: currentCashboxOperatorProperties,
      },
    }),
  },
};

export const createCashboxOperatorsSchema = {
  summary: "Create cashbox operators",
  description: "Create cashbox operators",
  tags: ["Cashboxes operators route"],
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
  description: "Delete cashbox operators",
  tags: ["Cashboxes operators route"],
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
