import { successAnswerTemplate } from "../schemas";

export const categoryProperties = {
  id: {
    type: "number",
    description: "Category ID",
  },
  name: {
    type: "string",
    description: "Category name",
  },
  icon: {
    type: "string",
    description: "Category icon",
  },
  color: {
    type: "string",
    description: "Category color",
  },
};

export const getCategoriesSchema = {
  summary: "Get categories",
  description: "Get categories",
  tags: ["Categories route"],
  response: {
    200: successAnswerTemplate({
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: categoryProperties,
        },
      },
    }),
  },
};
