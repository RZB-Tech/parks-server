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
    "Returns the online payments Z-report and daily application statistics. Defaults to the current Asia/Tashkent date.",
  tags: ["Online Payment Reports route"],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        format: "date",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Optional date in YYYY-MM-DD format.",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      date: {
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
