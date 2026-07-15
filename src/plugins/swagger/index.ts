// const pjson = require("../../../package.json");

// export const swaggerConfig = {
//   openapi: {
//     openapi: "3.1.0", // Важно для корректного отображения oneOf/anyOf
//     info: { title: "API", version: "1.0.0" },
//     components: {
//       securitySchemes: {
//         InitDataHeader: {
//           type: "apiKey",
//           name: "initdata",
//           in: "header",
//         },
//         BearerAuth: {
//           type: "http",
//           scheme: "bearer",
//           bearerFormat: "JWT",
//         },
//       },
//     },
//     security: [
//       {
//         InitDataHeader: [],
//       },
//       {
//         BearerAuth: [],
//       },
//     ],
//   },
//   swagger: {
//     info: {
//       title: "Backend test API documentation",
//       description: "structures of requests, responses and errors are described",
//       version: pjson.version,
//       contact: {
//         name: pjson.author,
//         email: pjson.email,
//       },
//     },
//   },
// };

const pjson = require("../../../package.json");

export const swaggerConfig = {
  openapi: {
    openapi: "3.1.0",

    info: {
      title: "Central Park API",
      description: "Dashboard and Telegram Mini App API documentation",
      version: pjson.version || "1.0.0",

      contact: {
        name: pjson.author || "RZB Tech",
        email: pjson.email || undefined,
      },
    },

    components: {
      securitySchemes: {
        InitDataHeader: {
          type: "apiKey",
          in: "header",
          name: "x-telegram-init-data",
          description: "Raw Telegram.WebApp.initData value",
        },

        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Dashboard JWT access token",
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

    tags: [
      {
        name: "Clients|Auth",
        description: "Client registration routes",
      },
      {
        name: "Clients|User",
        description: "Client profile routes",
      },
      {
        name: "Clients|Cards",
        description: "Client's cards routes",
      },
      {
        name: "Clients|Attractions",
        description: "Attraction routes",
      },
      {
        name: "Clients|Cashboxes",
        description: "Cashbox routes",
      },
      // {
      //   name: "Clients - Auth",
      //   description: "Telegram Mini App registration and OTP routes",
      // },
      // {
      //   name: "Clients - Cards",
      //   description: "Telegram Mini App card routes",
      // },

      // {
      //   name: "Dashboard - Auth",
      //   description: "Dashboard authentication routes",
      // },
      // {
      //   name: "Dashboard - Attractions",
      //   description: "Dashboard attraction routes",
      // },
      // {
      //   name: "Dashboard - Cashboxes",
      //   description: "Dashboard cashbox routes",
      // },
      // {
      //   name: "Dashboard - Reports",
      //   description: "Dashboard report routes",
      // },
    ],
  },

  hideUntagged: false,
};
