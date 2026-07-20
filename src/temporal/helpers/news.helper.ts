import { getTemporalClient } from "../client";
import { NewsLifecycleWorkflow } from "../workflows/news.workflow";

const NEWS_TASK_QUEUE = "news-queue";

export const getNewsWorkflowID = (newsID: number) => {
  return `news-${newsID}`;
};

export const startNewsLifecycleWorkflow = async (
  newsID: number,
  publishAt: string,
  expiredAt: string,
) => {
  const client = await getTemporalClient();

  await client.workflow.start(NewsLifecycleWorkflow, {
    taskQueue: NEWS_TASK_QUEUE,

    workflowId: getNewsWorkflowID(newsID),

    args: [newsID, publishAt, expiredAt],
  });
};

export const cancelNewsLifecycleWorkflows = async (newsIDs: number[]) => {
  const client = await getTemporalClient();

  await Promise.all(
    newsIDs.map(async (newsID) => {
      try {
        const handle = client.workflow.getHandle(getNewsWorkflowID(newsID));

        await handle.terminate("News workflow terminated");
      } catch (error) {
        console.log(
          `News workflow ${getNewsWorkflowID(newsID)} not found or already closed`,
        );
      }
    }),
  );
};

export const restartNewsLifecycleWorkflow = async (
  newsID: number,
  publishAt: string,
  expiredAt: string,
) => {
  await cancelNewsLifecycleWorkflows([newsID]);

  await startNewsLifecycleWorkflow(newsID, publishAt, expiredAt);
};
