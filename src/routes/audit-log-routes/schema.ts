import { AuditActionTypes } from "../../models/postgresql/audit-log-model/enums";
import { successAnswerTemplate } from "../schemas";

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

const nullableObject = {
  anyOf: [
    { type: "object", additionalProperties: true },
    { type: "null" },
  ],
};

export const getAuditLogsSchema = {
  summary: "Get dashboard audit logs",
  description:
    "Get paginated dashboard create, update and delete history. Accessible to superadmin, admin and owner.",
  tags: ["Audit logs route"],
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
      employee_id: { type: "integer", minimum: 1 },
      role: {
        type: "string",
        minLength: 1,
        description: "Employee role at the time of the action, e.g. admin",
      },
      action: {
        type: "string",
        enum: Object.values(AuditActionTypes),
      },
      entity_type: { type: "string", minLength: 1 },
      entity_id: { type: "string", minLength: 1 },
      date_from: { type: "string", format: "date" },
      date_to: { type: "string", format: "date" },
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
  },
  response: {
    200: successAnswerTemplate({
      audit_logs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            employee: {
              type: "object",
              properties: {
                id: { anyOf: [{ type: "integer" }, { type: "null" }] },
                name: { type: "string" },
                role: { type: "string" },
              },
            },
            action: {
              type: "string",
              enum: Object.values(AuditActionTypes),
            },
            entity_type: { type: "string" },
            entity_id: nullableString,
            old_values: nullableObject,
            new_values: nullableObject,
            route: nullableString,
            method: nullableString,
            ip_address: nullableString,
            user_agent: nullableString,
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    }),
  },
};
