import "dotenv/config";
import { Worker } from "@temporalio/worker";
import * as activities from "../activities/attraction-report.activities";
import { getWorkerConnection } from "../workerConnection";

export const runAttractionReportWorker = async () => {
  const worker = await Worker.create({
    connection: await getWorkerConnection(),
    workflowsPath: require.resolve("../workflows/attraction-report.workflow"),
    activities,
    taskQueue: "attraction-report-queue",
  });

  console.log("Attraction report worker started");

  await worker.run();
};
