import { reqBodyWrapper, successAnswerTemplate } from "../schemas";

export const FileProperties = {
  id: { type: "number" },
  name: { type: "string" },
  size: { type: "number" },
  type: { type: "string" },
};

export const uploadFilesSchema = {
  summary: "Upload files",
  description: "Upload files",
  tags: ["Files route"],
  consumes: ["multipart/form-data"],
  response: {
    200: successAnswerTemplate({
      files: {
        type: "object",
        properties: {
          dashboard_file: { type: ["number", "null"] },
          main_file: { type: ["number", "null"] },
          files: {
            type: "array",
            items: { type: "number" },
          },
          sub_attraction_files: {
            type: "array",
            items: { type: "number" },
          },
        },
      },
    }),
  },
};

export const getFileSchema = {
  summary: "Get file",
  description: "Get file",
  tags: ["Files route"],
  params: {
    type: "object",
    required: ["fileID", "type"],
    additionalProperties: false,
    properties: {
      fileID: {
        type: "integer",
        minimum: 1,
      },
      type: {
        type: "string",
        enum: ["view", "download"],
      },
    },
  },
};

export const deleteFilesSchema = {
  summary: "Delete files",
  description: "Delete files",
  tags: ["Files route"],
  body: reqBodyWrapper({
    type: "object",
    required: ["files"],
    additionalProperties: false,
    properties: {
      files: {
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
