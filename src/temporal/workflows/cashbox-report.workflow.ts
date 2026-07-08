import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/cashbox-report.activities";

const { closeUnclosedXReportsActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

export const closeUnclosedXReportsWorkflow = async () => {
  return await closeUnclosedXReportsActivity();
};
