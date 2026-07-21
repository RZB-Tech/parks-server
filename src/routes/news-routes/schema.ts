import { NewsStatusTypes } from "../../models/postgresql/news-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const newsResponseSchema = {
  type: "object",

  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    description: { type: "string" },
    file: {
      anyOf: [{ type: "integer" }, { type: "null" }],
    },
    status: {
      type: "string",
      enum: Object.values(NewsStatusTypes),
    },
    publish_at: {
      type: "string",
      format: "date-time",
    },
    expired_at: {
      type: "string",
      format: "date-time",
    },
    published_at: {
      anyOf: [
        {
          type: "string",
          format: "date-time",
        },
        { type: "null" },
      ],
    },
    archived_at: {
      anyOf: [
        {
          type: "string",
          format: "date-time",
        },
        { type: "null" },
      ],
    },
  },
};


export const getAllNewsSchema = {
  tags: ["News route"],
  summary: "Get all news",
  description:
    "Returns all news. If status is provided, returns only news with the selected status.",
  security: [
    {
      BearerAuth: [],
    },
  ],
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        enum: Object.values(NewsStatusTypes),
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      news: {
        type: "array",
        items: newsResponseSchema,
      },
    }),
  },
};


export const getNewsSchema = {
  tags: ["News route"],
  summary: "Get one news",
  description: "Returns one news item by news ID.",
  security: [
    {
      BearerAuth: [],
    },
  ],
  params: {
    type: "object",
    required: ["newsID"],
    additionalProperties: false,
    properties: {
      newsID: {
        type: "integer",
        minimum: 1,
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      news: newsResponseSchema,
    }),
  },
};

export const createNewsSchema = {
  tags: ["News route"],
  summary: "Create news",
  description:
    "Creates news and starts a Temporal workflow. News becomes active at publish_at and archived at expired_at.",
  security: [
    {
      BearerAuth: [],
    },
  ],
  body: reqBodyWrapper({
    type: "object",
    required: ["title", "description", "file", "publish_at", "expired_at"],
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: 255,
      },
      description: {
        type: "string",
        minLength: 1,
        maxLength: 10000,
      },
      file: {
        anyOf: [
          {
            type: "integer",
            minimum: 1,
          },
          { type: "null" },
        ],
      },
      publish_at: {
        type: "string",
        format: "date-time",
        description: "News activation date and time",
      },
      expired_at: {
        type: "string",
        format: "date-time",
        description: "News automatic archive date and time",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      news: newsResponseSchema,
    }),
  },
};

export const updateNewsSchema = {
  tags: ["News route"],
  summary: "Update news",
  description:
    "Updates news data. When publish_at or expired_at changes, the news Temporal workflow is restarted.",
  security: [
    {
      BearerAuth: [],
    },
  ],

  params: {
    type: "object",
    required: ["newsID"],
    additionalProperties: false,
    properties: {
      newsID: {
        type: "integer",
        minimum: 1,
      },
    },
  },

  body: reqBodyWrapper({
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: 255,
      },
      description: {
        type: "string",
        minLength: 1,
        maxLength: 10000,
      },
      image: {
        anyOf: [
          {
            type: "integer",
            minimum: 1,
          },
          { type: "null" },
        ],
      },
      publish_at: {
        type: "string",
        format: "date",
        description:
          "Publication date in YYYY-MM-DD format. The news becomes active at 00:00:00 Asia/Tashkent on this date.",
      },
      expired_at: {
        type: "string",
        format: "date",
        description:
          "Expiration date in YYYY-MM-DD format. The news remains active until 23:59:59.999 Asia/Tashkent on this date.",
      },
      status: {
        type: "string",
        enum: [NewsStatusTypes.ARCHIVED],
        description:
          "Manually archives the news and stops its Temporal lifecycle workflow.",
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      news: newsResponseSchema,
    }),
  },
};

export const deleteNewsSchema = {
  tags: ["News route"],
  summary: "Delete selected news",
  description:
    "Deletes selected news items and terminates their Temporal lifecycle workflows.",
  security: [
    {
      BearerAuth: [],
    },
  ],

  body: reqBodyWrapper({
    type: "object",
    required: ["newsIDs"],
    additionalProperties: false,
    properties: {
      newsIDs: {
        type: "array",
        minItems: 1,
        items: {
          type: "integer",
          minimum: 1,
        },
      },
    },
  }),
  response: {
    200: successAnswerTemplate({
      success: { type: "boolean", const: true },
    }),
  },
};
