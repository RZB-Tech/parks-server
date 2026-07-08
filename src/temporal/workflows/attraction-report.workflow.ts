import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/attraction-report.activities";

const { closeUnclosedAttractionReportsActivity } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

export const closeUnclosedAttractionReportsWorkflow = async () => {
  return await closeUnclosedAttractionReportsActivity();
};
