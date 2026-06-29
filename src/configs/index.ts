import fs from "fs";
import path from "path";
import pino from "pino";
import { SERVER } from "../consts/server";

const targets: any[] = [
  {
    target: "pino/file",
    level: "info",
    options: {
      destination: 1,
    },
  },
];

if (!process.env.DEV_MODE) {
  targets.push({
    target: "pino-loki",
    level: "info",
    options: {
      // host: process.env.LOKI_URL || "http://127.0.0.1:3100",
      labels: {
        app: "qubnix-server",
      },
      batching: true,
      interval: 5,
      timeout: 5000,
      json: true,
      replaceTimestamp: true,
    },
  });
}

export const fastifyConfig = {
  logger: {
    level: "info",
    base: { app: "qubnix-server" },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      targets,
    },
  },
  pluginTimeout: 120000,
  https:
    process.env.DEV_MODE === "1"
      ? {
          key: fs.readFileSync(
            path.resolve(__dirname, "../../ssl/private.key"),
          ),
          cert: fs.readFileSync(
            path.resolve(__dirname, "../../ssl/certificate.crt"),
          ),
        }
      : undefined,
  bodyLimit: SERVER.MAX_FILE_SIZE,
};
