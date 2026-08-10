import { proxyActivities, workflowInfo } from "@temporalio/workflow";
import type * as activities from "../activities/cashbox-report.activities";

const {
  closeUnclosedXReportsActivity,
  closeOnlineDailyZReportActivity,
  openOnlineDailyZReportActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: {
    initialInterval: "30 seconds",
    maximumInterval: "10 minutes",
    maximumAttempts: 10,
  },
});

export const closeUnclosedXReportsWorkflow = async () => {
  return await closeUnclosedXReportsActivity(
    workflowInfo().startTime.toISOString(),
  );
};

export const closeOnlineDailyZReportWorkflow = async () => {
  return await closeOnlineDailyZReportActivity(
    workflowInfo().startTime.toISOString(),
  );
};

export const openOnlineDailyZReportWorkflow = async () => {
  return await openOnlineDailyZReportActivity(
    workflowInfo().startTime.toISOString(),
  );
};
