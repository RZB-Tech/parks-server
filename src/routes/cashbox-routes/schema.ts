import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const cashboxProperties = {
  id: {
    type: "number",
    description: "Attraction ID",
    examples: [1],
  },
  device: {
    type: "number",
    description: "Device ID",
  },
  name: {
    type: "string",
    description: "Attraction name",
    examples: ["Roller Coaster"],
  },
  place: {
    type: "string",
    description: "Place of stayed cashbox",
    examples: ["Kirish 7"],
  },
  status: {
    type: "string",
    description: "Cashbox status",
    enum: Object.values(CashboxOperatorStatusTypes),
  },
  description: {
    type: "string",
    description: "Cashbox description",
    examples: ["Cashbox #7 new"],
  },
};

export const cashboxOperatorEmployeeSchema = {
  type: "object",
  properties: {
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
  },
};

export const cashboxStatsProperties = {
  cashboxes: { type: "integer" },
  active: { type: "integer" },
  inactive: { type: "integer" },
  maintenance: { type: "integer" },
  closed: { type: "integer" },
};

export const getCashboxSchema = {
  summary: "Get cashbox",
  description: "Get cashbox by id",
  tags: ["Cashboxes route"],

  querystring: {
    type: "object",
    additionalProperties: false,
    anyOf: [
      {
        required: ["cashboxID"],
      },
      {
        required: ["deviceID"],
      },
    ],
    properties: {
      cashboxID: {
        type: "number",
        description: "Cashbox ID",
      },

      deviceID: {
        type: "number",
        description: "Device ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      cashbox: {
        type: "object",
        properties: {
          ...cashboxProperties,
          operators: {
            type: "array",
            items: cashboxOperatorEmployeeSchema,
          },
        },
      },
    }),
  },
};

export const getCashboxStatsSchema = {
  summary: "Get cashbox status statistics",
  tags: ["Cashboxes route"],
  response: {
    200: successAnswerTemplate({
      cashbox_stats: {
        type: "object",
        properties: cashboxStatsProperties,
      },
    }),
  },
};

export const getCashboxesSchema = {
  summary: "Get cashboxes",
  description: "Get cashboxes",
  tags: ["Cashboxes route"],
  querystring: {
    type: "object",
    properties: {
      search: {
        type: "string",
      },
      statuses: {
        type: "string",
        // items: {
        //   type: "string",
        //   enum: ["active", "inactive", "vacation", "fired"],
        // },
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
        default: 10,
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      cashboxes: {
        type: "array",
        items: {
          tyep: "object",
          properties: {
            ...cashboxProperties,

            operators: {
              type: "array",
              items: cashboxOperatorEmployeeSchema,
            },
          },
        },
      },
      pagination: {
        type: "object",
        properties: {
          total: {
            type: "integer",
          },
          page: {
            type: "integer",
          },
          limit: {
            type: "integer",
          },
          totalPages: {
            type: "integer",
          },
        },
      },
    }),
  },
};

export const createCashboxSchema = {
  summary: "Create cashbox",
  description: "Create cashbox",
  tags: ["Cashboxes route"],
  body: reqBodyWrapper({
    type: "object",
    required: ["name", "place"],
    properties: {
      name: { type: "string" },
      place: { type: "string" },
      description: { type: "string" },
    },
  }),
  response: {
    200: successAnswerTemplate({
      cashbox: {
        type: "object",
        properties: cashboxProperties,
      },
    }),
  },
};

export const updateCashboxSchema = {
  summary: "Update cashbox",
  description: "Update cashbox",
  tags: ["Cashboxes route"],
  params: {
    type: "object",
    required: ["cashboxID"],
    properties: {
      cashboxID: {
        type: "number",
        description: "Cashbox ID",
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    properties: {
      device: { type: "number" },
      name: { type: "string" },
      place: { type: "string" },
      description: { type: "string" },
    },
  }),
  response: {
    200: successAnswerTemplate({
      cashbox: {
        type: "object",
        properties: cashboxProperties,
      },
    }),
  },
};

export const deleteCashboxesSchema = {
  summary: "Delete cashboxes",
  description: "Delete cashboxes",
  tags: ["Cashboxes route"],
  body: reqBodyWrapper({
    type: "object",
    required: ["cashboxIDs"],
    additionalProperties: false,
    properties: {
      cashboxIDs: {
        type: "array",
        description: "Cashbox IDs to delete",
        items: {
          type: "integer",
          minimum: 1,
        },
        minItems: 1,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};
