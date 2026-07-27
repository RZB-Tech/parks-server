import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../../schemas";

const nullableStringSchema = {
  anyOf: [
    {
      type: "string",
    },
    {
      type: "null",
    },
  ],
};

const nullableDateTimeSchema = {
  anyOf: [
    {
      type: "string",
      format: "date-time",
    },
    {
      type: "null",
    },
  ],
};

export const getMeSchema = {
  tags: ["Clients|User"],
  summary: "Get current user",
  description:
    "Validates Telegram Mini App initData and returns the current active and verified user.",
  security: [
    {
      InitDataHeader: [],
    },
  ],

  response: {
    200: successAnswerTemplate({
      user: {
        type: "object",
        properties: {
          id: { type: "integer" },
          telegram_username: nullableStringSchema,
          telegram_avatar: nullableStringSchema,
          telegram_first_name: { type: "string" },
          telegram_last_name: nullableStringSchema,
          fullname: { type: "string" },
          phone_number: { type: "string" },
          date_of_birth: {
            type: "string",
            format: "date",
          },
          status: {
            type: "string",
            enum: Object.values(UserStatusTypes),
          },
          registered_at: nullableDateTimeSchema,
        },
      },
    }),
  },
};

export const updateMeSchema = {
  tags: ["Clients|User"],
  summary: "Update current user",
  description: "Updates only the current user's fullname.",
  security: [
    {
      InitDataHeader: [],
    },
  ],
  body: reqBodyWrapper({
    type: "object",
    required: ["fullname"],
    additionalProperties: false,
    properties: {
      fullname: {
        type: "string",
        minLength: 2,
        maxLength: 255,
      },
    },
  }),
  response: getMeSchema.response,
};
