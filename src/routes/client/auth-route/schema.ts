import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../../schemas";

export const registerUserSchema = {
  tags: ["Clients|Auth"],
  summary: "Register user and send OTP",
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["fullname", "phone_number", "date_of_birth"],
    properties: {
      fullname: {
        type: "string",
        minLength: 2,
        maxLength: 150,
        examples: ["Orziyev Farrux"],
      },

      phone_number: {
        type: "string",
        minLength: 9,
        maxLength: 20,
        examples: ["+998901234567"],
      },

      date_of_birth: {
        type: "string",
        format: "date",
        examples: ["YYYY-MM-DD"],
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      registration: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          phone_number: { type: "string" },
          status: {
            type: "string",
            enum: [UserStatusTypes.PENDING],
          },

          expires_in: {
            type: "integer",
            examples: [120],
          },

          resend_in: {
            type: "integer",
            examples: [60],
          },

          remaining_send_attempts: {
            type: "integer",
            examples: [4],
          },
        },
      },
    }),
  },
};

export const verifyRegistrationOtpSchema = {
  tags: ["Clients|Auth"],
  summary: "Verify registration OTP",
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["phone_number", "code"],
    properties: {
      phone_number: {
        type: "string",
        minLength: 9,
        maxLength: 20,
        examples: ["+998901234567"],
      },

      code: {
        type: "string",
        pattern: "^[0-9]{6}$",
        examples: ["123456"],
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      user: {
        type: "object",
        properties: {
          id: { type: "integer" },
          telegram_id: { type: "integer" },

          telegram_chat_id: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
          },

          telegram_username: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
          },

          telegram_avatar: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
          },
          telegram_first_name: { type: "string" },

          telegram_last_name: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
          },

          fullname: {
            type: "string",
          },
          phone_number: {
            type: "string",
          },

          date_of_birth: {
            type: "string",
            format: "date",
          },

          status: {
            type: "string",
            enum: [UserStatusTypes.ACTIVE],
          },

          phone_verified_at: {
            type: "string",
            format: "date-time",
          },

          registered_at: {
            type: "string",
            format: "date-time",
          },
        },
      },
    }),
  },
};
