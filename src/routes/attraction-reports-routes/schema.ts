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

  total_organization: {
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

  headers: {
    type: "object",
    required: ["authorization", "device-id"],
    additionalProperties: true,
    properties: {
      authorization: {
        type: "string",
        description: "Bearer access token",
      },
      "device-id": {
        type: "string",
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
    required: ["attractionID", "reportID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },
      reportID: {
        type: "number",
        description: "Attraction report ID",
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
        description:
          "Send open to reopen stopped report, stopped to pause report, closed to close report.",
        enum: [
          AttractionReportStatusTypes.OPEN,
          AttractionReportStatusTypes.STOPPED,
          AttractionReportStatusTypes.CLOSED,
        ],
      },
      description: { type: "string" },
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

  total_organization: {
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
  description: {
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

export const confirmAttractionZReportsSchema = {
  summary: "Confirm Z reports",
  description:
    "Confirm or cancel all today's Z reports. All today Z report ids must be sent.",
  tags: ["Attraction reports route"],

  body: reqBodyWrapper({
    type: "object",
    required: ["zreports"],
    additionalProperties: false,
    properties: {
      zreports: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["id", "status"],
          additionalProperties: false,
          properties: {
            id: {
              type: "number",
            },

            status: {
              type: "string",
              enum: [AttractionReportStatusTypes.CONFIRMED],
            },
          },
        },
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};

export const accountingAttractionProperties = {
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
};

export const accountingAttractionZReportProperties = {
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

  total_organization: {
    type: "number",
  },

  paid_amount: {
    type: "number",
  },

  total_amount: {
    type: "number",
  },
};

export const accountingAttractionReportProperties = {
  attraction: {
    type: "object",
    properties: accountingAttractionProperties,
  },

  zreport: {
    type: "object",
    properties: accountingAttractionZReportProperties,
  },
};

export const getAccountingAttractionReportsSchema = {
  summary: "Get accounting attraction reports",
  description:
    "Get confirmed attraction Z reports grouped by attractions for accounting",
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

      start_date: {
        type: "string",
        description: "Start date format: YYYY-MM-DD",
      },

      end_date: {
        type: "string",
        description: "End date format: YYYY-MM-DD",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-reports": {
        type: "object",
        properties: {
          start_date: {
            type: "string",
          },

          end_date: {
            type: "string",
          },

          totals: {
            type: "object",
            properties: accountingAttractionZReportProperties,
          },

          attractions: {
            type: "array",
            items: {
              type: "object",
              properties: accountingAttractionReportProperties,
            },
          },
        },
      },
    }),
  },
};

export const getNotConfirmedAttractionZReportDatesSchema = {
  tags: ["Attraction reports route"],
  summary: "Get not confirmed attraction zreport dates",
  response: {
    200: {
      type: "object",
      properties: {
        dates: {
          type: "array",
          items: {
            type: "string",
            format: "date",
          },
        },
      },
    },
  },
};
