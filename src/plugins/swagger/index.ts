const pjson = require("../../../package.json");

export const swaggerConfig = {
  openapi: {
    openapi: "3.1.0", // Важно для корректного отображения oneOf/anyOf
    info: { title: "API", version: "1.0.0" },
    components: {
      securitySchemes: {
        InitDataHeader: {
          type: "apiKey",
          name: "initdata",
          in: "header",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        InitDataHeader: [],
      },
      {
        BearerAuth: [],
      },
    ],
  },
  swagger: {
    info: {
      title: "Backend test API documentation",
      description: "structures of requests, responses and errors are described",
      version: pjson.version,
      contact: {
        name: pjson.author,
        email: pjson.email,
      },
    },
  },
};
