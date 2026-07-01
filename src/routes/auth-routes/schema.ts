import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const EmployeeProperties = {
  id: { type: "number" },
  firstname: { type: "string" },
  lastname: { type: "string" },
  fullname: { type: "string" },
  date_of_birth: { type: "string" },
  phone_number: { type: "string" },
  telegram_username: {
    oneOf: [{ type: "string" }, { type: "null" }],
  },
  role: { type: "number" },
  salary: { type: "number" },
  status: { type: "string" },
  file: { type: "number" },
};


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

export const getMeSchema = {
  summary: "Get Me employee",
  description: "Get Me employee",
  tags: ["Auth route"],
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
  response: {
    200: successAnswerTemplate({
      employee: {
        type: "object",
        properties: EmployeeProperties,
      },
    }),
  },
};
