import "dotenv/config";
import { Worker } from "@temporalio/worker";
import * as activities from "../activities/news.activities";
import { getWorkerConnection } from "../workerConnection";

export const runNewsWorker = async () => {
  const worker = await Worker.create({
    connection: await getWorkerConnection(),
    workflowsPath: require.resolve("../workflows/news.workflow"),
    activities,
    taskQueue: "news-queue",
  });

  await worker.run();
};
