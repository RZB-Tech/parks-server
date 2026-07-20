import "dotenv/config";
import { Worker } from "@temporalio/worker";
import * as activities from "../activities/news.activities";

export const runNewsWorker = async () => {
  const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows/news.workflow"),
    activities,
    taskQueue: "news-queue",
  });

  await worker.run();
};
