export const getSchemaHeaders = (headers: {
  [key: string]: {
    header: { type: string; description: string };
    required: boolean;
  };
}) => {
  return {
    type: "object",
    required: Object.entries(headers)
      .filter(([, value]) => value.required)
      .map(([key]) => key),
    additionalProperties: true,
    properties: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        {
          type: value.header.type,
          description: value.header.description,
        },
      ]),
    ),
  };
};

export const successAnswerTemplate = (answer: any) => {
  return {
    type: "object",
    properties: {
      statusCode: { type: "number" },
      data: {
        type: "object",
        properties: answer,
      },
    },
  };
};
export const reqBodyWrapper = (body: any) => {
  return {
    type: "object",
    required: ["data"],
    additionalProperties: false,
    properties: {
      data: {
        ...body,
      },
    },
  };
};

export const employee_id = {
  type: "string",
  description: "Employee id",
};
