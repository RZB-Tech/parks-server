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

