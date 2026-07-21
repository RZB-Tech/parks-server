import "dotenv/config";
import { Worker } from "@temporalio/worker";
import * as activities from "../activities/promotion.activities";

export const runPromotionWorker = async () => {
  const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows/promotion.workflow"),
    activities,
    taskQueue: "promotion-queue",
  });

  await worker.run();
};
