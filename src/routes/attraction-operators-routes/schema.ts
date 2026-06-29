import {
  AttractionOperatorStatusTypes,
  AttractionOperatorTypes,
} from "../../models/postgresql/attraction-operator-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const attractionOperatorEmployeeProperties = {
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
  phone_number: {
    type: "string",
  },
  role: {
    type: "number",
  },
  status: {
    type: "string",
  },
};

export const attractionOperatorProperties = {
  id: {
    type: "number",
  },
  attraction: {
    type: "number",
  },
  type: {
    type: "string",
    enum: Object.values(AttractionOperatorTypes),
  },
  status: {
    type: "string",
    enum: Object.values(AttractionOperatorStatusTypes),
  },
  operator: {
    oneOf: [
      {
        type: "object",
        properties: attractionOperatorEmployeeProperties,
      },
      {
        type: "null",
      },
    ],
  },
};

export const operatorAttractionsProperties = {
  id: { type: "number" },
  name: { type: "string" },
  status: { type: "string" },
  main_file: {
    oneOf: [{ type: "number" }, { type: "null" }],
  },
  dashboard_file: {
    oneOf: [{ type: "number" }, { type: "null" }],
  },
  price: { type: "number" },
  age_limit: { type: "number" },
  min_height: { type: "number" },
  max_weight: { type: "number" },
  duration: { type: "number" },
  seats: { type: "number" },
};

export const getOperatorAttractionsSchema = {
  summary: "Get operator attractions",
  description: "Get attractions assigned to current operator",
  tags: ["Attraction operators route"],
  response: {
    200: successAnswerTemplate({
      "operator-attractions": {
        type: "array",
        items: {
          type: "object",
          properties: operatorAttractionsProperties,
        },
      },
    }),
  },
};


export const getOperatorAttractionSchema = {
  summary: "Get operator attraction",
  description: "Get selected attraction assigned to current operator",
  tags: ["Attraction operators route"],
  params: {
    type: "object",
    required: ["attractionID"],
    properties: {
      attractionID: {
        type: "number",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      "operator-attraction": {
        type: "object",
        properties: {
          operator: {
            type: "object",
            properties: attractionOperatorEmployeeProperties,
          },
          attraction: {
            type: "object",
            properties: operatorAttractionsProperties,
          },
        },
      },
    }),
  },
};

export const createAttractionOperatorsSchema = {
  summary: "Create attraction operators",
  description: "Create attraction operators",
  tags: ["Attraction operators route"],
  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    required: ["operator"],
    additionalProperties: false,
    properties: {
      operator: { type: "number" },
      type: {
        type: "string",
        enum: ["main", "assistant"],
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      "attraction-operator": {
        type: "object",
        properties: attractionOperatorProperties,
      },
    }),
  },
};

export const deleteAttractionOperatorsSchema = {
  summary: "Delete attraction operators",
  description: "Delete attraction operators",
  tags: ["Attraction operators route"],
  params: {
    type: "object",
    required: ["attractionID", "operatorID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
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
