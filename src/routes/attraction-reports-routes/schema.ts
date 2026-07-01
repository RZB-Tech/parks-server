import {
  AttractionReportStatusTypes,
  AttractionReportTypes,
} from "../../models/postgresql/attraction-report-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

const nullableString = {
  oneOf: [{ type: "string" }, { type: "null" }],
};

export const attractionReportOperatorProperties = {
  id: {
    type: "number",
  },

  firstname: {
    type: "string",
  },

  lastname: {
    type: "string",
  },

  file: nullableNumber,
};

export const attractionReportProperties = {
  id: {
    type: "number",
  },

  attraction: {
    type: "number",
  },

  operator: {
    oneOf: [
      {
        type: "number",
      },
      {
        type: "object",
        properties: attractionReportOperatorProperties,
      },
      {
        type: "null",
      },
    ],
  },

  report_type: {
    type: "string",
    enum: Object.values(AttractionReportTypes),
  },

  zreport: nullableNumber,

  status: {
    type: "string",
    enum: Object.values(AttractionReportStatusTypes),
  },

  opened_at: {
    type: "string",
  },

  stopped_at: nullableString,

  closed_at: nullableString,

  confirmed_at: nullableString,

  confirmed_by: nullableNumber,

  total_rounds: {
    type: "number",
  },

  total_people: {
    type: "number",
  },

  total_offline: {
    type: "number",
  },

  total_online: {
    type: "number",
  },

  total_vip: {
    type: "number",
  },

  total_guest: {
    type: "number",
  },

  total_park_staff: {
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
  description:
    "Open X report for current operator and selected attraction. If today's Z report is not opened, it will be opened automatically.",
  tags: ["Attraction reports route"],

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
    "Update current operator attraction report status. You can stop, reopen or close X/Z report.",
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
        description: "Attraction ID",
      },
    },
  },

  body: reqBodyWrapper({
    type: "object",
    required: ["status", "report_type"],
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        description:
          "Send open to reopen stopped report, stopped to pause report, closed to close report.",
        enum: [
          AttractionReportStatusTypes.OPEN,
          AttractionReportStatusTypes.STOPPED,
          AttractionReportStatusTypes.CLOSED,
        ],
      },

      report_type: {
        type: "string",
        description: "Report type. Send xreport or zreport.",
        enum: [AttractionReportTypes.XREPORT, AttractionReportTypes.ZREPORT],
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

export const attractionReportsTodayProperties = {
  zreport: {
    oneOf: [
      {
        type: "object",
        properties: attractionReportProperties,
      },
      {
        type: "null",
      },
    ],
  },

  xreports: {
    type: "array",
    items: {
      type: "object",
      properties: attractionReportProperties,
    },
  },
};

export const getTodayAttractionReportsSchema = {
  summary: "Get today attraction reports",
  description: "Get today's Z report and X reports for selected attraction",
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
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-reports": {
        type: "object",
        properties: attractionReportsTodayProperties,
      },
    }),
  },
};

export const attractionZReportsStatsProperties = {
  total: {
    type: "number",
  },

  open: {
    type: "number",
  },

  stopped: {
    type: "number",
  },

  waiting: {
    type: "number",
  },

  confirmed: {
    type: "number",
  },
};

export const attractionZReportsTotalsProperties = {
  total_rounds: {
    type: "number",
  },

  total_people: {
    type: "number",
  },

  total_offline: {
    type: "number",
  },

  total_online: {
    type: "number",
  },

  total_vip: {
    type: "number",
  },

  total_guest: {
    type: "number",
  },

  total_park_staff: {
    type: "number",
  },

  paid_amount: {
    type: "number",
  },

  total_amount: {
    type: "number",
  },
};

export const attractionWithZReportsProperties = {
  id: {
    type: "number",
  },

  name: {
    type: "string",
  },

  manufacturer: nullableString,

  category: {
    type: "number",
  },

  status: {
    type: "string",
  },

  dashboard_file: nullableNumber,

  main_file: nullableNumber,

  files: {
    type: "array",
    items: {
      type: "number",
    },
  },

  price: {
    type: "number",
  },

  duration: {
    type: "number",
  },

  seats: {
    type: "number",
  },

  age_limit: {
    type: "number",
  },

  min_height: {
    type: "number",
  },

  max_weight: {
    type: "number",
  },

  description: nullableString,

  zreports: {
    type: "array",
    items: {
      type: "object",
      properties: attractionReportProperties,
    },
  },
};

export const getAttractionZReportsSchema = {
  summary: "Get attraction Z reports",
  description: "Get attraction Z reports by date for admin panel",
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

  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        description: "Date format: YYYY-MM-DD",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      stats: {
        type: "object",
        properties: attractionZReportsStatsProperties,
      },

      totals: {
        type: "object",
        properties: attractionZReportsTotalsProperties,
      },

      attractions: {
        type: "array",
        items: {
          type: "object",
          properties: attractionWithZReportsProperties,
        },
      },
    }),
  },
};