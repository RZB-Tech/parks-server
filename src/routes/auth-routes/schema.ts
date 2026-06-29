import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const loginSchema = {
  summary: "Login employee",
  description: "Login employee by phone number and password",
  tags: ["Auth route"],
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: ["phone_number", "password"],
    properties: {
      phone_number: {
        type: "string",
        pattern: "^\\+998[0-9]{9}$",
        description: "Uzbekistan phone number format",
      },
      password: {
        type: "string",
        minLength: 6,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      auth: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
            description: "JWT access token",
          },
        },
      },
    }),
  },
};
