import { successAnswerTemplate } from "../schemas";

export const RoleProperties = {
  id: { type: "number" },
  name: { type: "string" },
};

export const getRolesSchema = {
  summary: "Get roles",
  description: "Get roles",
  tags: ["Roles route"],
  //   headers: getSchemaHeaders({
  //   }),
  response: {
    200: successAnswerTemplate({
      roles: {
        type: "array",
        items: {
          type: "object",
          properties: RoleProperties,
        },
      },
    }),
  },
};
