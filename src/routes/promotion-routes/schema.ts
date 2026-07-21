import {
  PromotionStatusTypes,
  PromotionTypes,
} from "../../models/postgresql/promotion-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const promotionAttractionResponseSchema = {
  type: "object",

  properties: {
    id: {
      type: "integer",
    //   example: 1,
    },
    name: {
      type: "string",
    //   example: "Flying Tigers",
    },
    original_price: {
      type: "number",
    //   example: 25000,
    },
    discounted_price: {
      type: "number",
    //   example: 20000,
    },
    sort_order: {
      type: "integer",
    //   example: 0,
    },
  },
};

export const promotionScheduleResponseSchema = {
  type: "object",

  properties: {
    starts_at: {
      anyOf: [
        {
          type: "string",
          format: "date-time",
        },
        { type: "null" },
      ],
    },

    ends_at: {
      anyOf: [
        {
          type: "string",
          format: "date-time",
        },
        { type: "null" },
      ],
    },

    start_date: {
      anyOf: [
        {
          type: "string",
          format: "date",
        },
        { type: "null" },
      ],
    },

    end_date: {
      anyOf: [
        {
          type: "string",
          format: "date",
        },
        { type: "null" },
      ],
    },

    start_time: {
      anyOf: [
        {
          type: "string",
        //   example: "10:00:00",
        },
        {
          type: "null",
        },
      ],
    },

    end_time: {
      anyOf: [
        {
          type: "string",
        //   example: "16:00:00",
        },
        {
          type: "null",
        },
      ],
    },

    weekdays: {
      anyOf: [
        {
          type: "array",

          items: {
            type: "integer",
            minimum: 1,
            maximum: 7,
          },

        //   example: [1, 2, 3, 4, 5, 6, 7],
        },

        {
          type: "null",
        },
      ],
    },
  },
};

export const promotionResponseSchema = {
  type: "object",

  properties: {
    id: {
      type: "integer",
    //   example: 1,
    },

    code: {
      type: "string",
    //   example: "PROMO-A1B2C3",
    },

    name: {
      type: "string",
    //   example: "DUJU-0916",
    },

    description: {
      anyOf: [
        {
          type: "string",
        //   example: "Har kuni 20% chegirma",
        },

        {
          type: "null",
        },
      ],
    },

    type: {
      type: "string",
      enum: Object.values(PromotionTypes),
    //   example: PromotionTypes.REGULAR,
    },

    status: {
      type: "string",
      enum: Object.values(PromotionStatusTypes),
    //   example: PromotionStatusTypes.PLANNED,
    },

    discount_percent: {
      type: "number",
    //   example: 20,
    },

    schedule: promotionScheduleResponseSchema,

    file: { type: "integer" },

    attractions: {
      type: "array",
      items: promotionAttractionResponseSchema,
    },

    created_at: {
      type: "string",
      format: "date-time",
    },
  },
};

export const createPromotionSchema = {
  tags: ["Promotions route"],
  summary: "Create promotion",
  description:
    "Creates a new promotion for selected attractions. The promotion is initially created with planned status and its Temporal lifecycle workflow starts after successful database creation.",

  security: [
    {
      BearerAuth: [],
    },
  ],

  body: reqBodyWrapper({
    type: "object",
    required: [
      "name",
      "type",
      "code",
      "discount_percent",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "attractions",
    ],

    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 150,
        // example: "DUJU-0916",
      },

      description: {
        anyOf: [
          {
            type: "string",
            minLength: 1,
            maxLength: 2000,
            // example: "Har kuni 10:00 dan 16:00 gacha 20% chegirma",
          },

          {
            type: "null",
          },
        ],
      },

      code: { type: "string" },

      type: {
        type: "string",
        enum: Object.values(PromotionTypes),
        // example: PromotionTypes.REGULAR,
      },

      discount_percent: {
        type: "number",
        exclusiveMinimum: 0,
        maximum: 100,
        // example: 20,
      },

      start_date: {
        type: "string",
        format: "date",
        // example: "2026-07-21",
      },

      end_date: {
        type: "string",
        format: "date",
        // example: "2026-08-31",
      },

      start_time: {
        type: "string",
        pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
        // example: "10:00",
      },

      end_time: {
        type: "string",
        pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
        // example: "16:00",
      },

      weekdays: {
        type: "array",
        uniqueItems: true,

        items: {
          type: "integer",
          minimum: 1,
          maximum: 7,
        },

        description:
          "ISO weekdays: 1 = Monday, 7 = Sunday. If omitted, the promotion applies every day.",

        // example: [1, 2, 3, 4, 5, 6, 7],
      },

      attractions: {
        type: "array",
        minItems: 1,
        uniqueItems: true,

        items: {
          type: "integer",
          minimum: 1,
        },

        // example: [1, 2, 5],
      },

      file: {
        type: "integer",
        minimum: 1,
        // example: 15,
      },
    },
  }),

  response: {
    200: successAnswerTemplate({
      promotion: promotionResponseSchema,
    }),
  },
};
