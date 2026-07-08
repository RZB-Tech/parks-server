import "dotenv/config";
import { ScheduleOverlapPolicy } from "@temporalio/client";
import { getTemporalClient } from "./client";
import { closeUnclosedXReportsWorkflow } from "./workflows/cashbox-report.workflow";
import { closeUnclosedAttractionReportsWorkflow } from "./workflows/attraction-report.workflow";

const createScheduleSafe = async (data: {
  scheduleId: string;
  workflowType: any;
  taskQueue: string;
  hour: number;
  minute: number;
}) => {
  const client = await getTemporalClient();

  try {
    await client.schedule.create({
      scheduleId: data.scheduleId,
      action: {
        type: "startWorkflow",
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
        catchupWindow: "1 hour",
      },
    });

    console.log(`${data.scheduleId} created`);
  } catch (error: any) {
    const message = String(error?.message || "");

    if (message.includes("already")) {
      console.log(`${data.scheduleId} already exists`);
      return;
    }

    throw error;
  }
};

const run = async () => {
  await createScheduleSafe({
    scheduleId: "nightly-close-unclosed-xreports",
    workflowType: closeUnclosedXReportsWorkflow,
    taskQueue: "cashbox-report-queue",
    hour: 17,
    minute: 45,
  });

  await createScheduleSafe({
    scheduleId: "nightly-close-unclosed-attraction-reports",
    workflowType: closeUnclosedAttractionReportsWorkflow,
    taskQueue: "attraction-report-queue",
    hour: 17,
    minute: 45,
  });
};

run()
  .then(() => {
    console.log("Temporal schedules checked");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Temporal schedules failed:", error);
    process.exit(1);
  });
