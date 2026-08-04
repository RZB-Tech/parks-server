import "dotenv/config";
import {
  ScheduleAlreadyRunning,
  ScheduleOverlapPolicy,
} from "@temporalio/client";
import { getTemporalClient } from "./client";
import {
  closeOnlineDailyZReportWorkflow,
  closeUnclosedXReportsWorkflow,
  openOnlineDailyZReportWorkflow,
} from "./workflows/cashbox-report.workflow";
import { closeUnclosedAttractionReportsWorkflow } from "./workflows/attraction-report.workflow";

const ensureSchedule = async (data: {
  scheduleId: string;
  workflowType: any;
  taskQueue: string;
  hour: number;
  minute: number;
  catchupWindowMs?: number;
}) => {
  const client = await getTemporalClient();
  const schedule = {
    action: {
      type: "startWorkflow" as const,
      workflowType: data.workflowType,
      taskQueue: data.taskQueue,
    },
    spec: {
      calendars: [
        {
          hour: data.hour,
          minute: data.minute,
          second: 0,
        },
      ],
      timezone: "Asia/Tashkent",
    },
    policies: {
      overlap: ScheduleOverlapPolicy.SKIP,
      catchupWindow: data.catchupWindowMs ?? 60 * 60 * 1000,
    },
  };

  try {
    await client.schedule.create({
      scheduleId: data.scheduleId,
      ...schedule,
    });

    console.log(`${data.scheduleId} created`);
  } catch (error) {
    if (!(error instanceof ScheduleAlreadyRunning)) {
      throw error;
    }

    const handle = client.schedule.getHandle(data.scheduleId);

    await handle.update((previous) => ({
      ...schedule,
      state: previous.state,
      searchAttributes: previous.searchAttributes,
      typedSearchAttributes: previous.typedSearchAttributes,
    }));

    console.log(`${data.scheduleId} updated`);
  }
};

export const ensureTemporalSchedules = async () => {
  await ensureSchedule({
    scheduleId: "nightly-close-unclosed-xreports",
    workflowType: closeUnclosedXReportsWorkflow,
    taskQueue: "cashbox-report-queue",
    hour: 3,
    minute: 0,
  });

  await ensureSchedule({
    scheduleId: "nightly-close-unclosed-attraction-reports",
    workflowType: closeUnclosedAttractionReportsWorkflow,
    taskQueue: "attraction-report-queue",
    hour: 2,
    minute: 59,
  });

  await ensureSchedule({
    scheduleId: "nightly-close-online-payment-zreport",
    workflowType: closeOnlineDailyZReportWorkflow,
    taskQueue: "cashbox-report-queue",
    hour: 23,
    minute: 59,
    catchupWindowMs: 30 * 1000,
  });

  await ensureSchedule({
    scheduleId: "daily-open-online-payment-zreport",
    workflowType: openOnlineDailyZReportWorkflow,
    taskQueue: "cashbox-report-queue",
    hour: 0,
    minute: 0,
  });
};

if (require.main === module) {
  ensureTemporalSchedules()
    .then(() => {
      console.log("Temporal schedules checked");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Temporal schedules failed:", error);
      process.exit(1);
    });
}
