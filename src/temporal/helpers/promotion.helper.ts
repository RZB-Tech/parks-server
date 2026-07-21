// temporal/clients/promotion-temporal.client.ts

import {
  WorkflowIdConflictPolicy,
  WorkflowIdReusePolicy,
  WorkflowNotFoundError,
} from "@temporalio/client";

import { getTemporalClient } from "../client";

import { PromotionLifecycleWorkflow } from "../workflows/promotion.workflow";

export const PROMOTION_TASK_QUEUE = "promotion-queue";

export const getPromotionWorkflowID = (promotionID: number) => {
  return `promotion-${promotionID}`;
};

export const StartPromotionWorkflow = async (promotionID: number) => {
  const id = Number(promotionID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("PROMOTION_ID_IS_INVALID");
  }

  const client = await getTemporalClient();

  return await client.workflow.start(PromotionLifecycleWorkflow, {
    taskQueue: PROMOTION_TASK_QUEUE,
    workflowId: getPromotionWorkflowID(id),
    args: [id],

    /*
     * Bir xil promotion workflow ishlayotgan bo‘lsa,
     * yangi duplicate yaratmaydi.
     */
    workflowIdConflictPolicy: WorkflowIdConflictPolicy.USE_EXISTING,

    /*
     * Oldingi execution yopilgan bo‘lsa,
     * kerak bo‘lganda qayta boshlash mumkin.
     */
    workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE,
  });
};

export const RefreshPromotionWorkflow = async (
  promotionID: number,
): Promise<void> => {
  const id = Number(promotionID);

  const client = await getTemporalClient();

  const workflowID = getPromotionWorkflowID(id);

  try {
    const handle = client.workflow.getHandle(workflowID);

    await handle.signal("promotion-refresh");
  } catch (error) {
    /*
     * Workflow hali yo‘q yoki oldin tugagan bo‘lsa,
     * boshqattan start qilamiz.
     */
    if (error instanceof WorkflowNotFoundError) {
      await StartPromotionWorkflow(id);
      return;
    }

    throw error;
  }
};
