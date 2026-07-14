import { readFileSync } from "node:fs";

const hierarchicalTagsPlugin = readFileSync(
  require.resolve(
    "swagger-ui-plugin-hierarchical-tags",
  ),
  "utf8",
);

export const swaggerUiConfig = {
  routePrefix: "/docs",

  uiConfig: {
    docExpansion: "none",
    deepLinking: true,
    persistAuthorization: true,

    hierarchicalTagSeparator: /\|/,

    plugins: [
      function HierarchicalTagsPluginProxy(
        system: unknown,
      ) {
        return (
          globalThis as any
        ).HierarchicalTagsPlugin(system);
      },
    ],
  },

  theme: {
    title: "Central Park API",

    js: [
      {
        filename: "hierarchical-tags.js",
        content: hierarchicalTagsPlugin,
      },
    ],
  },
};