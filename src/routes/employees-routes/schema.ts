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
  cashboxes: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
    },
  },
  attractions: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
    },
  },
};

export const EmployeeStatsProperties = {
  employees: { type: "integer" },
  active: { type: "integer" },
  inactive: { type: "integer" },
  vacation: { type: "integer" },
  fired: { type: "integer" },
};

export const getEmployeeSchema = {
  summary: "Get employee",
  description: "Get employee superadmin admin owner director head_marketing",
  tags: ["Employees route"],
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
  params: {
    type: "object",
    required: ["employeeID"],
    additionalProperties: false,
    properties: {
      employeeID: { type: "integer", minimum: 1 },
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

export const getEmployeeStatsSchema = {
  summary: "Get employees status statistics",
  tags: ["Employees route"],
  description: "Get employee stats superadmin admin owner director head_marketing",
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
      employee_stats: {
        type: "object",
        properties: EmployeeStatsProperties,
      },
    }),
  },
};

export const getEmployeesSchema = {
  summary: "Get employees",
  description: "Get employees superadmin admin owner director head_marketing",
  tags: ["Employees route"],
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
    properties: {
      search: {
        type: "string",
      },
      roles: {
        type: "integer",
        // items: {
        //   type: "integer",
        // },
      },
      statuses: {
        type: "string",
        // items: {
        //   type: "string",
        //   enum: ["active", "inactive", "vacation", "fired"],
        // },
      },
      page: {
        type: "integer",
        minimum: 1,
        default: 1,
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      employees: {
        type: "array",
        items: {
          type: "object",
          properties: EmployeeProperties,
        },
      },
      pagination: {
        type: "object",
        properties: {
          total: {
            type: "integer",
          },
          page: {
            type: "integer",
          },
          limit: {
            type: "integer",
          },
          totalPages: {
            type: "integer",
          },
        },
      },
    }),
  },
};

export const createEmployeesSchema = {
  summary: "Create employee",
  description: "Create employee superadmin admin",
  tags: ["Employees route"],
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
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    required: [
      "firstname",
      "lastname",
      "date_of_birth",
      "phone_number",
      "password",
      "telegram_username",
      "role",
    ],
    properties: {
      firstname: { type: "string", minLength: 2 },
      lastname: { type: "string", minLength: 2 },
      date_of_birth: {
        type: "string",
        format: "date",
        description: "ISO date string (YYYY-MM-DD)",
      },
      phone_number: {
        type: "string",
        pattern: "^\\+998[0-9]{9}$",
        // example: "+998901234567",
        description: "Uzbekistan phone number format",
      },
      telegram_username: { type: "string" },
      password: { type: "string", minLength: 6 },
      role: { type: "integer", minimum: 1 },
      salary: { type: ["integer", "null"] },
      file: {
        type: ["integer", "null"],
        minimum: 1,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      employee: {
        type: "object",
        properties: EmployeeProperties,
      },
    }),
  },
};

export const updateEmployeesSchema = {
  summary: "Update employee",
  description: "Update employee superadmin admin",
  tags: ["Employees route"],
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
  params: {
    type: "object",
    required: ["employeeID"],
    additionalProperties: false,
    properties: {
      employeeID: { type: "integer", minimum: 1 },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    properties: {
      firstname: { type: "string", minLength: 2 },
      lastname: { type: "string", minLength: 2 },
      date_of_birth: {
        type: "string",
        format: "date",
        description: "ISO date string (YYYY-MM-DD)",
      },
      phone_number: {
        type: "string",
        pattern: "^\\+998[0-9]{9}$",
        // example: "+998901234567",
        description: "Uzbekistan phone number format",
      },
      telegram_username: { type: "string" },
      password: { type: "string", minLength: 6 },
      role: { type: "integer", minimum: 1 },
      salary: { type: ["integer", "null"] },
      file: {
        type: ["integer", "null"],
        minimum: 1,
      },
      status: { type: "string" },
    },
  }),
  response: {
    200: successAnswerTemplate({
      employee: {
        type: "object",
        properties: EmployeeProperties,
      },
    }),
  },
};

export const deleteEmployeesSchema = {
  summary: "Delete employees",
  description: "Delete employees superadmin admin",
  tags: ["Employees route"],
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
  body: reqBodyWrapper({
    type: "object",
    required: ["employeeIDs"],
    additionalProperties: false,
    properties: {
      employeeIDs: {
        type: "array",
        items: {
          type: "integer",
          minimum: 1,
        },
        minItems: 1,
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};
