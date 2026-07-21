import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type * as activities from "../activities/promotion.activities";

const { GetPromotionLifecycleStateActivity, SyncPromotionStatusActivity } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "1 minute",

    retry: {
      initialInterval: "2 seconds",
      backoffCoefficient: 2,
      maximumInterval: "1 minute",
      maximumAttempts: 10,
    },
  });

export const RefreshPromotionSignal = defineSignal("promotion-refresh");

export const PromotionLifecycleWorkflow = async (
  promotionID: number,
): Promise<void> => {
  /*
   * Promotion edit qilinsa signal bu qiymatni oshiradi.
   */
  let scheduleRevision = 0;

  setHandler(RefreshPromotionSignal, () => {
    scheduleRevision += 1;
  });

  while (true) {
    /*
     * Activity ishlayotgan vaqtda signal kelsa,
     * eski schedule bilan sleep qilmaslik uchun.
     */
    const currentRevision = scheduleRevision;

    const state = await GetPromotionLifecycleStateActivity(promotionID);

    if (scheduleRevision !== currentRevision) {
      continue;
    }

    if (!state.exists) {
      return;
    }

    await SyncPromotionStatusActivity(promotionID, state.next_status);

    if (scheduleRevision !== currentRevision) {
      continue;
    }

    if (state.terminal || !state.next_transition_at) {
      return;
    }

    const transitionAt = new Date(state.next_transition_at).getTime();

    const delay = Math.max(1, transitionAt - Date.now());

    /*
     * Ikki holatda uyg‘onadi:
     *
     * 1. Timer tugadi.
     * 2. Promotion edit bo‘lib signal keldi.
     */
    await condition(() => scheduleRevision !== currentRevision, delay);
  }
};
