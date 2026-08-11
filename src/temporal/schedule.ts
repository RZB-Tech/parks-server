import "dotenv/config";
import {
  ScheduleAlreadyRunning,
  ScheduleNotFoundError,
  ScheduleOverlapPolicy,
} from "@temporalio/client";
import { getTemporalClient } from "./client";
import { closeUnclosedXReportsWorkflow } from "./workflows/cashbox-report.workflow";
import { closeUnclosedAttractionReportsWorkflow } from "./workflows/attraction-report.workflow";

const CASHBOX_APP_OWNED_SCHEDULE_IDS = [
  "nightly-close-online-payment-zreport",
  "daily-open-online-payment-zreport",
] as const;

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
      overlap: ScheduleOverlapPolicy.BUFFER_ONE,
      catchupWindow: data.catchupWindowMs ?? 36 * 60 * 60 * 1000,
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
      state: {
        paused: false,
      },
      searchAttributes: previous.searchAttributes,
      typedSearchAttributes: previous.typedSearchAttributes,
    }));

    console.log(`${data.scheduleId} updated`);
  }
};

const removeCashboxAppOwnedSchedules = async () => {
  const client = await getTemporalClient();

  for (const scheduleId of CASHBOX_APP_OWNED_SCHEDULE_IDS) {
    try {
      await client.schedule.getHandle(scheduleId).delete();
      console.log(`${scheduleId} deleted; now owned by the cashbox app`);
    } catch (error) {
      if (!(error instanceof ScheduleNotFoundError)) {
        throw error;
      }

      console.log(`${scheduleId} is already absent`);
    }
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
    hour: 3,
    minute: 0,
  });

  await removeCashboxAppOwnedSchedules();
};

/**
 * Reconcile legacy/unclosed report data immediately after deployment instead
 * of waiting for the next scheduled tick. Workflows apply their own business
 * cutoff, so reports opened after that boundary are safe from recovery.
 */
export const triggerReportRecovery = async () => {
  const client = await getTemporalClient();

  await Promise.all([
    client.schedule
      .getHandle("nightly-close-unclosed-xreports")
      .trigger(ScheduleOverlapPolicy.BUFFER_ONE),
    client.schedule
      .getHandle("nightly-close-unclosed-attraction-reports")
      .trigger(ScheduleOverlapPolicy.BUFFER_ONE),
  ]);
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
