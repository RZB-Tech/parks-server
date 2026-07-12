import { reqBodyWrapper, successAnswerTemplate } from "../schemas";
const sosReportResponseSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    id: {
      type: "number",
    },

    source: {
      type: "string",
      enum: ["attraction", "cashbox"],
    },

    description: {
      type: "string",
    },

    operator: {
      anyOf: [
        {
          type: "object",
          required: ["id", "fullname", "phone_number"],
          additionalProperties: false,

          properties: {
            id: {
              type: "number",
            },

            fullname: {
              type: "string",
            },

            phone_number: {
              anyOf: [
                {
                  type: "string",
                },
                {
                  type: "null",
                },
              ],
            },
          },
        },
        {
          type: "null",
        },
      ],
    },

    attraction: {
      anyOf: [
        {
          type: "object",
          required: ["id", "name"],
          additionalProperties: false,

          properties: {
            id: {
              type: "number",
            },

            name: {
              type: "string",
            },
          },
        },
        {
          type: "null",
        },
      ],
    },

    cashbox: {
      anyOf: [
        {
          type: "object",
          required: ["id", "name"],
          additionalProperties: false,

          properties: {
            id: {
              type: "number",
            },

            name: {
              type: "string",
            },
          },
        },
        {
          type: "null",
        },
      ],
    },

    createdAt: {
      type: "string",
      format: "date-time",
    },
  },
};
export const createSosSchema = {
  summary: "Create SOS report",

  description:
    "Create an SOS report from an active attraction operator or cashbox operator.",

  tags: ["SOS route"],

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
    required: ["source", "sourceID"],
    additionalProperties: false,

    properties: {
      source: {
        type: "string",
        enum: ["attraction", "cashbox"],
        description: "SOS source type",
      },

      sourceID: {
        type: "string",
        pattern: "^[1-9][0-9]*$",
        description:
          "Attraction ID when source is attraction, or cashbox ID when source is cashbox",
      },
    },
  },

  body: reqBodyWrapper({
    type: "object",
    required: ["description"],
    additionalProperties: false,

    properties: {
      description: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description: "Description of the problem",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
        "sos": sosReportResponseSchema,
    }),
  },
};

export const getSosReportsSchema = {
  summary: "Get SOS reports",

  description:
    "Get paginated SOS reports created by attraction and cashbox operators.",

  tags: ["SOS route"],

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
      page: {
        type: "string",
        pattern: "^[1-9][0-9]*$",
      },

      limit: {
        type: "string",
        pattern: "^[1-9][0-9]*$",
      },

      source: {
        type: "string",
        enum: ["attraction", "cashbox"],
      },

      search: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      "sos": {
        type: "object",
        required: ["reports", "pagination"],
        additionalProperties: false,
        properties: {
          reports: {
            type: "array",
            items: sosReportResponseSchema,
          },

          pagination: {
            type: "object",
            required: ["page", "limit", "total", "total_pages"],
            additionalProperties: false,
            properties: {
              page: {
                type: "number",
              },

              limit: {
                type: "number",
              },

              total: {
                type: "number",
              },

              total_pages: {
                type: "number",
              },
            },
          },
        },
      },
    }),
  },
};
