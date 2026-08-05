import { proxyActivities, workflowInfo } from "@temporalio/workflow";
import type * as activities from "../activities/attraction-report.activities";

const { closeUnclosedAttractionReportsActivity } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "5 minutes",
  retry: {
    initialInterval: "30 seconds",
    maximumInterval: "10 minutes",
    maximumAttempts: 10,
  },
});

export const closeUnclosedAttractionReportsWorkflow = async () => {
  return await closeUnclosedAttractionReportsActivity(
    workflowInfo().startTime.toISOString(),
  );
};
