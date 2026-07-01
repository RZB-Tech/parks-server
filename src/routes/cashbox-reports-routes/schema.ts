import {
  CashboxReportStatusTypes,
  CashboxReportTypes,
} from "../../models/postgresql/cashbox-report-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const cashboxReportOperatorProperties = {
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
    type: ["number", "null"],
  },
};

export const cashboxReportProperties = {
  id: {
    type: "number",
  },

  operator: {
    anyOf: [
      {
        type: "object",
        properties: cashboxReportOperatorProperties,
      },
      {
        type: "null",
      },
    ],
  },

  cashbox: {
    type: "number",
  },

  checked_by: {
    type: ["number", "null"],
  },

  report_type: {
    type: "string",
    enum: Object.values(CashboxReportTypes),
  },

  zreport: {
    type: ["number", "null"],
  },

  report_date: {
    type: "string",
  },

  status: {
    type: "string",
    enum: Object.values(CashboxReportStatusTypes),
  },

  opened_at: {
    type: "string",
  },

  closed_at: {
    type: ["string", "null"],
  },

  total_amount: {
    type: "number",
  },

  cash_amount: {
    type: "number",
  },

  card_amount: {
    type: "number",
  },

  online_amount: {
    type: "number",
  },

  uzcard_amount: {
    type: "number",
  },

  humo_amount: {
    type: "number",
  },

  uzum_amount: {
    type: "number",
  },

  payme_amount: {
    type: "number",
  },

  click_amount: {
    type: "number",
  },

  activated_cards_count: {
    type: "number",
  },

  relationed_cards_count: {
    type: "number",
  },

  transactions_count: {
    type: "number",
  },

  xreports_count: {
    type: ["number", "null"],
  },

  created_at: {
    type: "string",
  },
};

const nullableNumber = {
  oneOf: [{ type: "number" }, { type: "null" }],
};

const nullableString = {
  oneOf: [{ type: "string" }, { type: "null" }],
};

export const zReportOperatorProperties = {
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

export const zReportProperties = {
  id: {
    type: "number",
  },
  operator: {
    oneOf: [
      {
        type: "object",
        properties: zReportOperatorProperties,
      },
      {
        type: "null",
      },
    ],
  },

  checked_by: nullableNumber,

  report_type: {
    type: "string",
    enum: Object.values(CashboxReportTypes),
  },

  zreport: nullableNumber,

  report_date: {
    type: "string",
  },

  status: {
    type: "string",
    enum: Object.values(CashboxReportStatusTypes),
  },

  opened_at: {
    type: "string",
  },

  closed_at: nullableString,

  total_amount: {
    type: "number",
  },

  cash_amount: {
    type: "number",
  },

  card_amount: {
    type: "number",
  },

  online_amount: {
    type: "number",
  },

  uzcard_amount: {
    type: "number",
  },

  humo_amount: {
    type: "number",
  },

  uzum_amount: {
    type: "number",
  },

  payme_amount: {
    type: "number",
  },

  click_amount: {
    type: "number",
  },

  activated_cards_count: {
    type: "number",
  },

  relationed_cards_count: {
    type: "number",
  },

  transactions_count: {
    type: "number",
  },

  xreports_count: nullableNumber,

  created_at: {
    type: "string",
  },
};

export const zReportCashboxWithReportsProperties = {
  id: { type: "number" },
  name: { type: "string" },
  place: { type: "string" },
  status: { type: "string" },

  description: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },

  zreports: {
    type: "array",
    items: {
      type: "object",
      properties: zReportProperties,
    },
  },
};

export const zReportsStatsProperties = {
  total: {
    type: "number",
  },

  open: {
    type: "number",
  },

  stopped: {
    type: "number",
  },

  confirmed: {
    type: "number",
  },

  cancelled: {
    type: "number",
  },
};

export const paginationProperties = {
  total: {
    type: "number",
  },

  page: {
    type: "number",
  },

  limit: {
    type: "number",
  },

  totalPages: {
    type: "number",
  },
};

export const accountingZReportAmountProperties = {
  total_amount: {
    type: "number",
  },

  cash_amount: {
    type: "number",
  },

  card_amount: {
    type: "number",
  },

  online_amount: {
    type: "number",
  },

  uzcard_amount: {
    type: "number",
  },

  humo_amount: {
    type: "number",
  },

  uzum_amount: {
    type: "number",
  },

  payme_amount: {
    type: "number",
  },

  click_amount: {
    type: "number",
  },

  activated_cards_count: {
    type: "number",
  },

  relationed_cards_count: {
    type: "number",
  },

  transactions_count: {
    type: "number",
  },

  xreports_count: {
    type: "number",
  },
};

export const openReportSchema = {
  summary: "Open report",
  description: "Open report for current cashier/operator",
  tags: ["Cashbox Reports route"],

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

  response: {
    200: successAnswerTemplate({
      "cashbox-report": {
        type: "object",
        properties: cashboxReportProperties,
      },
    }),
  },
};

export const cashboxReportsTodaySchema = {
  summary: "Get operator today reports",
  description: "Get current operator today's reports",
  tags: ["Cashbox Reports route"],

  response: {
    200: successAnswerTemplate({
      "cashbox-reports": {
        type: "object",
        properties: {
          zreport: {
            oneOf: [
              {
                type: "object",
                properties: cashboxReportProperties,
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
              properties: cashboxReportProperties,
            },
          },
        },
      },
    }),
  },
};

export const statusCashboxReportSchema = {
  summary: "Update report status",
  description: "Update the status of a cashbox report",
  tags: ["Cashbox Reports route"],

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
    required: ["status", "report_type"],
    properties: {
      status: {
        type: "string",
        enum: [
          CashboxReportStatusTypes.OPEN,
          CashboxReportStatusTypes.STOPPED,
          CashboxReportStatusTypes.CLOSED,
          CashboxReportStatusTypes.CONFIRMED,
          CashboxReportStatusTypes.CANCELLED,
        ],
      },
      report_type: {
        type: "string",
        enum: [
          CashboxReportTypes.ZREPORT,
          CashboxReportTypes.XREPORT,
        ],
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};

export const getZReportsSchema = {
  summary: "Get Z reports",
  description: "Get Z reports by date for admin panel",
  tags: ["Cashbox Reports route"],

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
        properties: zReportsStatsProperties,
      },

      totals: {
        type: "object",
        properties: accountingZReportAmountProperties,
      },

      cashboxes: {
        type: "array",
        items: {
          type: "object",
          properties: zReportCashboxWithReportsProperties,
        },
      },
    }),
  },
};

export const confirmZReportsSchema = {
  summary: "Confirm Z reports",
  description:
    "Confirm or cancel all today's Z reports. All today Z report ids must be sent.",
  tags: ["Cashbox Reports route"],

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
              enum: [
                CashboxReportStatusTypes.CONFIRMED,
                CashboxReportStatusTypes.CANCELLED,
              ],
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

export const reopenZReportsSchema = {
  summary: "Reopen Z reports",
  description:
    "Reopen or cancel all today's Z reports. All today Z report ids must be sent.",
  tags: ["Cashbox Reports route"],

  body: reqBodyWrapper({
    type: "object",
    required: ["zreport"],
    additionalProperties: false,
    properties: {
      zreport: {
        type: "number",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};

export const accountingCashboxProperties = {
  id: {
    type: "number",
  },

  name: {
    type: "string",
  },

  place: {
    type: "string",
  },

  status: {
    type: "string",
  },

  description: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },
};

export const accountingCashboxReportProperties = {
  cashbox: {
    type: "object",
    properties: accountingCashboxProperties,
  },

  zreport: {
    type: "object",
    properties: accountingZReportAmountProperties,
  },
};

export const getAccountingCashboxReportsSchema = {
  summary: "Get accounting cashbox reports",
  description: "Get confirmed Z reports grouped by cashboxes for accounting",
  tags: ["Cashbox Reports route"],

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
        description: "Date format: YYYY.MM.DD",
      },

      start_date: {
        type: "string",
        description: "Start date format: YYYY.MM.DD",
      },

      end_date: {
        type: "string",
        description: "End date format: YYYY.MM.DD",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "cashbox-reports": {
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
            properties: accountingZReportAmountProperties,
          },

          cashboxes: {
            type: "array",
            items: {
              type: "object",
              properties: accountingCashboxReportProperties,
            },
          },
        },
      },
    }),
  },
};
