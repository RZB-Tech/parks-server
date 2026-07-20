import { proxyActivities, sleep } from "@temporalio/workflow";

import type * as activities from "../activities/news.activities";

const { activateNewsActivity, archiveNewsActivity } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "5 minutes",

  retry: {
    maximumAttempts: 3,
    initialInterval: "10 seconds",
    maximumInterval: "1 minute",
  },
});

export async function NewsLifecycleWorkflow(
  newsID: number,
  publishAt: string,
  expiredAt: string,
): Promise<void> {
  const publishTime = new Date(publishAt).getTime();
  const expirationTime = new Date(expiredAt).getTime();

  /*
   * Workflow kechroq ishga tushsa va yangilikning
   * muddati allaqachon tugagan bo‘lsa.
   */
  if (Date.now() >= expirationTime) {
    await archiveNewsActivity(newsID);
    return;
  }

  /*
   * Planned yangilik publish_at vaqtigacha kutadi.
   */
  const publishDelay = publishTime - Date.now();

  if (publishDelay > 0) {
    await sleep(publishDelay);
  }

  /*
   * Publish kutayotgan vaqt davomida expired_at
   * o‘tib ketgan bo‘lishi mumkin.
   */
  if (Date.now() >= expirationTime) {
    await archiveNewsActivity(newsID);
    return;
  }

  /*
   * Planned bo‘lsa active qiladi.
   * Allaqachon active bo‘lsa activity no-op bo‘ladi.
   */
  await activateNewsActivity(newsID);

  const expirationDelay = expirationTime - Date.now();

  if (expirationDelay > 0) {
    await sleep(expirationDelay);
  }

  await archiveNewsActivity(newsID);
}
