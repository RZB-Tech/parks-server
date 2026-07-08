import "dotenv/config";
import { Worker } from "@temporalio/worker";
import * as activities from "../activities/cashbox-report.activities";

export const runCashboxReportWorker = async () => {
  const worker = await Worker.create({
    workflowsPath: require.resolve("../workflows/cashbox-report.workflow"),
    activities,
    taskQueue: "cashbox-report-queue",
  });

  console.log("Cashbox report worker started");

  await worker.run();
};
