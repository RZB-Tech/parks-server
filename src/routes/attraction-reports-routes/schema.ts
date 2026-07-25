import {
  AttractionReportStatusTypes,
  AttractionReportTypes,
} from "../../models/postgresql/attraction-report-model/enums";

import { PromotionTypes } from "../../models/postgresql/promotion-model/enums";

import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

const nullableNumber = {
  oneOf: [
    {
      type: "number",
    },
    {
      type: "null",
    },
  ],
};

const nullableString = {
  oneOf: [
    {
      type: "string",
    },
    {
      type: "null",
    },
  ],
};

const nullableDateTime = {
  oneOf: [
    {
      type: "string",
      format: "date-time",
    },
    {
      type: "null",
    },
  ],
};

const nullablePromotionType = {
  oneOf: [
    {
      type: "string",
      enum: Object.values(PromotionTypes),
    },
    {
      type: "null",
    },
  ],
};

const authorizationHeaders = {
  type: "object",
  required: ["authorization"],
  additionalProperties: true,

  properties: {
    authorization: {
      type: "string",
      description: "Bearer access token",
    },
  },
};

export const promotionReportProperties = {
  promotion: nullableNumber,

  promotion_key: {
    type: "string",
  },

  promotion_code: nullableString,

  /*
   * DTO promotion bo‘lmasa "AKSIYASIZ" qaytaradi.
   */
  promotion_name: {
    type: "string",
  },

  promotion_type: nullablePromotionType,

  promotion_started_at: {
    oneOf: [
      {
        type: "string",
        format: "date-time",
      },
      {
        type: "null",
      },
    ],
  },

  promotion_ended_at: {
    oneOf: [
      {
        type: "string",
        format: "date-time",
      },
      {
        type: "null",
      },
    ],
  },

  discount_percent: {
    type: "number",
  },

  original_unit_price: {
    type: "number",
  },

  sale_unit_price: {
    type: "number",
  },

  transactions_count: {
    type: "number",
  },

  total_people: {
    type: "number",
  },

  total_virtual: {
    type: "number",
  },

  total_classic: {
    type: "number",
  },

  total_vip: {
    type: "number",
  },

  total_organization: {
    type: "number",
  },

  total_online: {
    type: "number",
  },

  total_offline: {
    type: "number",
  },

  original_amount: {
    type: "number",
  },

  discount_amount: {
    type: "number",
  },

  paid_amount: {
    type: "number",
  },
};

export const promotionReportSchema = {
  type: "object",
  additionalProperties: false,

  properties: promotionReportProperties,
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

export const attractionReportOperatorSchema = {
  type: "object",
  additionalProperties: false,

  properties: attractionReportOperatorProperties,
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

      attractionReportOperatorSchema,

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
    format: "date-time",
  },

  stopped_at: nullableDateTime,

  closed_at: nullableDateTime,

  confirmed_at: nullableDateTime,

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

  total_virtual: {
    type: "number",
  },

  total_classic: {
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

  promotion_reports: {
    type: "array",

    items: promotionReportSchema,
  },

  created_at: {
    type: "string",
    format: "date-time",
  },
};

export const attractionReportSchema = {
  type: "object",
  additionalProperties: false,

  properties: attractionReportProperties,
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
        minimum: 1,
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-report": attractionReportSchema,
    }),
  },
};

export const updateAttractionReportStatusSchema = {
  summary: "Update attraction report status",

  description:
    "Update current operator attraction report status. You can stop, reopen or close X/Z report.",

  tags: ["Attraction reports route"],

  headers: authorizationHeaders,

  params: {
    type: "object",
    required: ["attractionID", "reportID"],
    additionalProperties: false,

    properties: {
      attractionID: {
        type: "number",
        minimum: 1,
        description: "Attraction ID",
      },

      reportID: {
        type: "number",
        minimum: 1,
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
          "Send open to reopen stopped report, stopped to pause report, or closed to close report.",

        enum: [
          AttractionReportStatusTypes.OPEN,
          AttractionReportStatusTypes.STOPPED,
          AttractionReportStatusTypes.CLOSED,
        ],
      },

      description: nullableString,
    },
  }),

  response: {
    200: successAnswerTemplate({
      "attraction-report": attractionReportSchema,
    }),
  },
};

export const attractionReportsTodayProperties = {
  zreport: {
    oneOf: [
      attractionReportSchema,
      {
        type: "null",
      },
    ],
  },

  xreports: {
    type: "array",
    items: attractionReportSchema,
  },
};

export const getTodayAttractionReportsSchema = {
  summary: "Get today attraction reports",
  description:
    "Get today's Z report and X reports with promotion statistics for selected attraction.",
  tags: ["Attraction reports route"],
  headers: authorizationHeaders,
  params: {
    type: "object",
    required: ["attractionID"],
    additionalProperties: false,
    properties: {
      attractionID: {
        type: "number",
        minimum: 1,
        description: "Attraction ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-reports": {
        type: "object",
        additionalProperties: false,
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

  total_virtual: {
    type: "number",
  },

  total_classic: {
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

  category: nullableNumber,

  status: {
    type: "string",
  },

  description: nullableString,

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

  zreports: {
    type: "array",

    items: attractionReportSchema,
  },
};

export const getAttractionZReportsSchema = {
  summary: "Get attraction Z reports",
  description:
    "Get attraction Z reports with aggregated promotion statistics by date for admin panel.",
  tags: ["Attraction reports route"],
  headers: authorizationHeaders,
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        format: "date",
        description: "Date format: YYYY-MM-DD",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      stats: {
        type: "object",
        additionalProperties: false,
        properties: attractionZReportsStatsProperties,
      },

      totals: {
        type: "object",
        additionalProperties: false,
        properties: attractionZReportsTotalsProperties,
      },

      attractions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: attractionWithZReportsProperties,
        },
      },
    }),
  },
};

export const confirmAttractionZReportsSchema = {
  summary: "Confirm Z reports",
  description: "Confirm selected attraction Z reports.",
  tags: ["Attraction reports route"],
  headers: authorizationHeaders,
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
              minimum: 1,
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
      success: {
        type: "boolean",
        const: true,
      },
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

  category: nullableNumber,

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

  total_virtual: {
    type: "number",
  },

  total_classic: {
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

export const promotionReportTotalsProperties = {
  transactions_count: {
    type: "number",
  },

  total_people: {
    type: "number",
  },

  total_virtual: {
    type: "number",
  },

  total_classic: {
    type: "number",
  },

  total_vip: {
    type: "number",
  },

  total_organization: {
    type: "number",
  },

  total_online: {
    type: "number",
  },

  total_offline: {
    type: "number",
  },

  original_amount: {
    type: "number",
  },

  discount_amount: {
    type: "number",
  },

  paid_amount: {
    type: "number",
  },
};

export const accountingAttractionReportProperties = {
  attraction: {
    type: "object",
    additionalProperties: false,
    properties: accountingAttractionProperties,
  },

  zreport: {
    type: "object",
    additionalProperties: false,
    properties: accountingAttractionZReportProperties,
  },

  promotion_totals: {
    type: "object",
    additionalProperties: false,
    properties: promotionReportTotalsProperties,
  },

  promotion_reports: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: promotionReportProperties,
    },
  },
};

export const getAccountingAttractionReportsSchema = {
  summary: "Get accounting attraction reports",
  description:
    "Get confirmed attraction Z reports grouped by attractions for accounting.",
  tags: ["Attraction reports route"],
  headers: authorizationHeaders,
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        format: "date",
        description: "Date format: YYYY-MM-DD",
      },

      start_date: {
        type: "string",
        format: "date",
        description: "Start date format: YYYY-MM-DD",
      },

      end_date: {
        type: "string",
        format: "date",
        description: "End date format: YYYY-MM-DD",
      },

      promotion_code: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "Filter promotion statistics by exact promotion code",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "attraction-reports": {
        type: "object",
        additionalProperties: false,

        properties: {
          start_date: {
            type: "string",
            format: "date-time",
          },

          end_date: {
            type: "string",
            format: "date-time",
          },

          promotion_code: nullableString,

          /*
           * Barcha selected CONFIRMED Z-reportlar totalsi.
           */
          totals: {
            type: "object",
            additionalProperties: false,
            properties: accountingAttractionZReportProperties,
          },

          /*
           * Filterdan o‘tgan promotion reportlar totalsi.
           */
          promotion_totals: {
            type: "object",
            additionalProperties: false,
            properties: promotionReportTotalsProperties,
          },

          attractions: {
            type: "array",

            items: {
              type: "object",
              additionalProperties: false,
              properties: accountingAttractionReportProperties,
            },
          },
        },
      },
    }),
  },
};

export const getNotConfirmedAttractionZReportDatesSchema = {
  summary: "Get not confirmed attraction Z report dates",
  description: "Get dates that contain unconfirmed attraction Z reports.",
  tags: ["Attraction reports route"],
  headers: authorizationHeaders,
  response: {
    200: successAnswerTemplate({
      dates: {
        type: "array",
        items: {
          type: "string",
          format: "date",
        },
      },
    }),
  },
};
