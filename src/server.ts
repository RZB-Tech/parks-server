import "dotenv/config";
import { build } from "./app";
import getHostAddress from "./utils/getHostAddress";

import { runCashboxReportWorker } from "./temporal/workers/cashbox-report.worker";
import { runAttractionReportWorker } from "./temporal/workers/attraction-report.worker";
import { runNewsWorker } from "./temporal/workers/news.worker";
import { runPromotionWorker } from "./temporal/workers/promotion.worker";
import {
  ensureTemporalSchedules,
  triggerReportRecovery,
} from "./temporal/schedule";

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

    fastify.log.info({ actor: "parks-server" }, "Server started successfully");

    if (process.env.TEMPORAL_WORKERS_ENABLED !== "false") {
      const startWorker = (name: string, run: () => Promise<void>) => {
        void (async () => {
          let failedAttempts = 0;

          while (true) {
            try {
              await run();
              return;
            } catch (error) {
              failedAttempts += 1;
              const retryDelayMs = Math.min(
                30_000,
                1_000 * 2 ** Math.min(failedAttempts - 1, 5),
              );

              fastify.log.error(
                {
                  err: error,
                  worker: name,
                  retry_delay_ms: retryDelayMs,
                },
                "Temporal worker stopped; retrying",
              );

              await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
          }
        })();
      };

      startWorker("cashbox-report", runCashboxReportWorker);
      startWorker("attraction-report", runAttractionReportWorker);
      startWorker("news", runNewsWorker);
      startWorker("promotion", runPromotionWorker);
    }

    if (process.env.TEMPORAL_SCHEDULES_ENABLED !== "false") {
      void (async () => {
        let failedAttempts = 0;

        while (true) {
          try {
            await ensureTemporalSchedules();
            await triggerReportRecovery();
            return;
          } catch (error) {
            failedAttempts += 1;
            const retryDelayMs = Math.min(
              30_000,
              1_000 * 2 ** Math.min(failedAttempts - 1, 5),
            );

            fastify.log.error(
              { err: error, retry_delay_ms: retryDelayMs },
              "Temporal schedules setup failed; retrying",
            );

            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
        }
      })();
    }
  } catch (err) {
    const fastify = await app;

    fastify.log.fatal((err as Error).message);
    process.exit(1);
  }
})();
