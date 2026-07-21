import "dotenv/config";
import { build } from "./app";
import getHostAddress from "./utils/getHostAddress";

import { runCashboxReportWorker } from "./temporal/workers/cashbox-report.worker";
import { runAttractionReportWorker } from "./temporal/workers/attraction-report.worker";
import { runNewsWorker } from "./temporal/workers/news.worker";
import { runPromotionWorker } from "./temporal/workers/promotion.worker";

export const app = build();

(async () => {
  try {
    const fastify = await app;

    await fastify.ready();

    const serverHost = getHostAddress();

    if (!serverHost) {
      throw new Error("Cannot determine host address");
    }

    await fastify.listen({
      port: +process.env.SERVER_PORT!,
      host: process.env.DEV_MODE === "1" ? "192.168.0.146" : serverHost,
    });

    fastify.log.info({ actor: "qubnix-server" }, "Server started successfully");

    if (process.env.TEMPORAL_WORKERS_ENABLED !== "false") {
      void runCashboxReportWorker();
      void runAttractionReportWorker();
      void runNewsWorker();
      void runPromotionWorker();
    }
  } catch (err) {
    const fastify = await app;

    fastify.log.fatal((err as Error).message);
    process.exit(1);
  }
})();
