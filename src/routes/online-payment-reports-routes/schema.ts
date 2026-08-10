import { CashboxReportStatusTypes } from "../../models/postgresql/cashbox-report-model/enums";
import { successAnswerTemplate } from "../schemas";

const amountProperties = {
  total_amount: { type: "number" },
  uzum_amount: { type: "number" },
  click_amount: { type: "number" },
  payme_amount: { type: "number" },
  oneqr_amount: { type: "number" },
};

const applicationStatsProperties = {
  registered_users_count: { type: "number" },
  virtual_cards_opened_count: { type: "number" },
  registered_users_with_virtual_card_count: { type: "number" },
  registered_users_without_virtual_card_count: { type: "number" },
  bonus_per_virtual_card: { type: "number" },
  total_bonus_amount: { type: "number" },
};

export const getOnlinePaymentDailyReportSchema = {
  summary: "Get online payments daily report",
  description:
    "Returns online payment Z-reports and application statistics for a date or an inclusive from/to range in Asia/Tashkent. Defaults to the current date.",
  tags: ["Online Payment Reports route"],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        format: "date",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description:
          "Optional date in YYYY-MM-DD format. Cannot be used with from/to.",
      },
      from: {
        type: "string",
        format: "date",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description:
          "Inclusive range start in YYYY-MM-DD format. Must be used with to.",
      },
      to: {
        type: "string",
        format: "date",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description:
          "Inclusive range end in YYYY-MM-DD format. Must be used with from.",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      date: {
        oneOf: [
          { type: "string", format: "date" },
          { type: "null" },
        ],
      },
      from: {
        type: "string",
        format: "date",
      },
      to: {
        type: "string",
        format: "date",
      },
      timezone: {
        type: "string",
      },
      z_report: {
        oneOf: [
          {
            type: "object",
            properties: {
              id: { type: "number" },
              status: {
                type: "string",
                enum: Object.values(CashboxReportStatusTypes),
              },
              opened_at: { type: "string", format: "date-time" },
              closed_at: {
                oneOf: [
                  { type: "string", format: "date-time" },
                  { type: "null" },
                ],
              },
            },
          },
          { type: "null" },
        ],
      },
      z_reports: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            date: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: Object.values(CashboxReportStatusTypes),
            },
            opened_at: { type: "string", format: "date-time" },
            closed_at: {
              oneOf: [
                { type: "string", format: "date-time" },
                { type: "null" },
              ],
            },
          },
        },
      },
      payments: {
        type: "object",
        properties: amountProperties,
      },
      application_stats: {
        type: "object",
        properties: applicationStatsProperties,
      },
    }),
  },
};
