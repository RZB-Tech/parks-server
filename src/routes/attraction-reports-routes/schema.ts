import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const attractionReportProperties = {
  id: {
    type: "number",
  },
  attraction: {
    type: "number",
  },
  operator: {
    type: "number",
  },
  status: {
    type: "string",
    enum: Object.values(AttractionReportStatusTypes),
  },
  opened_at: {
    type: "string",
  },
  closed_at: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },
  total_rounds: {
    type: "number",
  },
  total_people: {
    type: "number",
  },
  paid_amount: {
    type: "number",
  },
  total_amount: {
    type: "number",
  },
  created_at: {
    type: "string",
  },
};

export const openAttractionReportSchema = {
  summary: "Open attraction report",
  description: "Open report for current operator and selected attraction",
  tags: ["Attraction reports route"],
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
      "attraction-report": {
        type: "object",
        properties: attractionReportProperties,
      },
    }),
  },
};

export const updateAttractionReportStatusSchema = {
  summary: "Update attraction report status",
  description:
    "Update current operator attraction report status to stopped or closed",
  tags: ["Attraction reports route"],

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
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
      },
    },
  },

  body: reqBodyWrapper({
    type: "object",
    required: ["status"],
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        enum: [
          AttractionReportStatusTypes.STOPPED,
          AttractionReportStatusTypes.CLOSED,
        ],
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      "attraction-report": {
        type: "object",
        properties: attractionReportProperties,
      },
    }),
  },
};
