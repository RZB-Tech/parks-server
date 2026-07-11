import { AttractionStatusTypes } from "../../models/postgresql/attraction-model/enums";
import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const attractionProperties = {
  id: {
    type: "number",
    description: "Attraction ID",
    examples: [1],
  },
  device: {
    type: "number",
    description: "Device ID associated with the attraction",
    examples: [1178377401],
  },
  name: {
    type: "string",
    description: "Attraction name",
    examples: ["Roller Coaster"],
  },
  manufacturer: {
    type: "string",
    description: "Manufacturer company name",
    examples: ["Intamin"],
  },
  status: {
    type: "string",
    description: "Attraction status",
    enum: Object.values(AttractionStatusTypes),
  },
  dashboard_file: {
    type: "number",
    nullable: true,
    description: "Optional dashboard image file ID",
  },
  main_file: {
    type: "number",
    nullable: true,
    description: "Optional main image file ID",
  },
  files: {
    type: "array",
    description: "Optional gallery file IDs",
    items: { type: "number" },
    examples: [[14, 15, 16]],
  },
  price: {
    type: "number",
    description: "Attraction price",
    examples: [25000],
  },
  duration: {
    type: "number",
    description: "Ride duration in minutes",
    examples: [5],
  },
  seats: {
    type: "number",
    description: "Number of seats",
    examples: [24],
  },
  age_limit: {
    type: "number",
    description: "Minimum allowed age",
    examples: [12],
  },
  min_height: {
    type: "number",
    description: "Minimum height in centimeters",
    examples: [120],
  },
  max_weight: {
    type: "number",
    description: "Maximum weight in kilograms",
    examples: [100],
  },
  description: {
    type: "string",
    description: "Attraction description",
    examples: ["High-speed roller coaster with sharp turns."],
  },
};

export const attractionOperatorEmployeeSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    firstname: { type: "string" },
    lastname: { type: "string" },
    file: {
      oneOf: [{ type: "number" }, { type: "null" }],
    },
    type: { type: "string" },
  },
};

export const AttractionStatsProperties = {
  attractions: { type: "integer" },
  active: { type: "integer" },
  inactive: { type: "integer" },
  stopped: { type: "integer" },
  maintenance: { type: "integer" },
  closed: { type: "integer" },
};

export const getAttractionSchema = {
  summary: "Get attraction",
  description:
    "Get attraction by id and device id superadmin, admin, owner, director, head_marketing, head_operator, operator",
  tags: ["Attractions route"],
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
    anyOf: [
      {
        required: ["attractionID"],
      },
      {
        required: ["deviceID"],
      },
    ],
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },

      deviceID: {
        type: "number",
        description: "Device ID",
      },
    },
  },

  response: {
    200: successAnswerTemplate({
      attraction: {
        type: "object",
        properties: {
          ...attractionProperties,

          operators: {
            type: "array",
            items: attractionOperatorEmployeeSchema,
          },
        },
      },
    }),
  },
};

export const getAttractionsStatsSchema = {
  summary: "Get attractions status statistics",
  description:
    "Get attraction stats superadmin, admin, owner, director, head_marketing, head_operator, operator",
  tags: ["Attractions route"],
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
      attraction_stats: {
        type: "object",
        properties: AttractionStatsProperties,
      },
    }),
  },
};

export const getAttractionsSchema = {
  summary: "Get attractions",
  description:
    "Get attraction superadmin, admin, owner, director, head_marketing, head_operator, operator",
  tags: ["Attractions route"],
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
      categories: {
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
      attractions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ...attractionProperties,

            operators: {
              type: "array",
              items: attractionOperatorEmployeeSchema,
            },
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

export const createAttractionSchema = {
  summary: "Create attraction",
  description: "Create attraction superadmin, head_marketing, head_operator",
  tags: ["Attractions route"],
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
    required: [
      "name",
      "manufacturer",
      "price",
      "duration",
      "seats",
      "age_limit",
      "min_height",
      "max_weight",
      "description",
    ],
    properties: {
      name: attractionProperties.name,
      manufacturer: attractionProperties.manufacturer,
      dashboard_file: attractionProperties.dashboard_file,
      main_file: attractionProperties.main_file,
      files: attractionProperties.files,
      price: attractionProperties.price,
      duration: attractionProperties.duration,
      seats: attractionProperties.seats,
      age_limit: attractionProperties.age_limit,
      min_height: attractionProperties.min_height,
      max_weight: attractionProperties.max_weight,
      description: attractionProperties.description,
    },
  }),
  response: {
    200: successAnswerTemplate({
      attraction: {
        type: "object",
        properties: attractionProperties,
      },
    }),
  },
};

export const updateAttractionSchema = {
  summary: "Update attraction",
  description: "Update attraction superadmin, head_marketing, head_operator",
  tags: ["Attractions route"],
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
    required: ["attractionID"],
    properties: {
      attractionID: {
        type: "number",
        description: "Attraction ID",
      },
    },
  },
  body: reqBodyWrapper({
    type: "object",
    properties: {
      device: attractionProperties.device,
      name: attractionProperties.name,
      manufacturer: attractionProperties.manufacturer,
      status: attractionProperties.status,
      dashboard_file: attractionProperties.dashboard_file,
      main_file: attractionProperties.main_file,
      files: attractionProperties.files,
      price: attractionProperties.price,
      duration: attractionProperties.duration,
      seats: attractionProperties.seats,
      age_limit: attractionProperties.age_limit,
      min_height: attractionProperties.min_height,
      max_weight: attractionProperties.max_weight,
      description: attractionProperties.description,
    },
  }),
  response: {
    200: successAnswerTemplate({
      attraction: {
        type: "object",
        properties: attractionProperties,
      },
    }),
  },
};

export const deleteAttractionsSchema = {
  summary: "Delete attractions",
  description: "Delete attractions superadmin, head_marketing, head_operator",
  tags: ["Attractions route"],
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
    required: ["attractionIDs"],
    additionalProperties: false,
    properties: {
      attractionIDs: {
        type: "array",
        description: "Attraction IDs to delete",
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
