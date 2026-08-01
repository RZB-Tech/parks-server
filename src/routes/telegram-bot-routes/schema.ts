export const telegramWebhookSchema = {
  tags: ["Integrations|Telegram"],
  summary: "Receive Telegram bot updates",
  description:
    "Receives private chat messages from Telegram and processes the Central Park registration flow.",
  headers: {
    type: "object",
    required: ["x-telegram-bot-api-secret-token"],
    properties: {
      "x-telegram-bot-api-secret-token": { type: "string", minLength: 1 },
    },
  },
  body: {
    type: "object",
    additionalProperties: true,
    required: ["update_id"],
    properties: {
      update_id: { type: "integer" },
      message: {
        type: "object",
        additionalProperties: true,
        properties: {
          text: { type: "string" },
          chat: {
            type: "object",
            additionalProperties: true,
            required: ["id", "type"],
            properties: {
              id: { type: "integer" },
              type: { type: "string" },
            },
          },
          from: {
            type: "object",
            additionalProperties: true,
            required: ["id", "first_name"],
            properties: {
              id: { type: "integer" },
              first_name: { type: "string" },
              last_name: { type: "string" },
              username: { type: "string" },
            },
          },
          contact: {
            type: "object",
            additionalProperties: true,
            required: ["phone_number"],
            properties: {
              phone_number: { type: "string" },
              user_id: { type: "integer" },
            },
          },
        },
      },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["ok"],
      properties: { ok: { type: "boolean" } },
    },
    401: {
      type: "object",
      required: ["statusCode", "message"],
      properties: {
        statusCode: { type: "integer" },
        message: { type: "string" },
      },
    },
  },
};
