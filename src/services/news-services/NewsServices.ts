import { Op, WhereOptions } from "sequelize";
import { NewsDTO } from "../../dtos/news-dtos/NewsDto";
import { BadRequest, InternalServerError, NotFound } from "../../exceptions";
import { FileModel } from "../../models/postgresql/file-model/FileModel";
import { NewsStatusTypes } from "../../models/postgresql/news-model/enums";
import { NewsModel } from "../../models/postgresql/news-model/NewsModel";
import {
  cancelNewsLifecycleWorkflows,
  restartNewsLifecycleWorkflow,
  startNewsLifecycleWorkflow,
} from "../../temporal/helpers/news.helper";
import {
  getTashkentDayEnd,
  getTashkentDayStart,
} from "../../utils/newsDateHelper";

export const GetAllNewsService = async (query: GetAllNewsQuery) => {
  const where: WhereOptions<NewsModelI> = {};

  if (query.status) {
    where.status = query.status;
  }

  const news = await NewsModel.findAll({
    where,
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  return news.map((item) => NewsDTO(item.get({ plain: true })));
};

export const GetNewsService = async (params: NewsParams) => {
  const newsID = Number(params.newsID);

  if (!Number.isInteger(newsID) || newsID <= 0) {
    throw BadRequest("News ID is invalid");
  }

  const news = await NewsModel.findByPk(newsID);

  if (!news) {
    throw NotFound("News not found");
  }

  return NewsDTO(news.get({ plain: true }));
};

export const CreateNewsService = async (body: CreateNewsData) => {
  const title = body.title?.trim();
  const description = body.description?.trim();
  const publishAt = new Date(body.publish_at);
  const expiredAt = new Date(body.expired_at);

  if (expiredAt.getTime() <= publishAt.getTime()) {
    throw BadRequest("News expiration date must be after publish date");
  }

  const now = new Date();

  if (expiredAt.getTime() <= now.getTime()) {
    throw BadRequest("News expiration date must be in the future");
  }

  let fileID: number | null = null;

  if (body.file !== undefined && body.file !== null) {
    fileID = Number(body.file);

    const image = await FileModel.findByPk(fileID, {
      attributes: ["id"],
    });

    if (!image) {
      throw BadRequest("News image not found");
    }
  }

  const status =
    publishAt.getTime() > now.getTime()
      ? NewsStatusTypes.PLANNED
      : NewsStatusTypes.ACTIVE;

  const news = await NewsModel.create({
    title,
    description,
    file: fileID,
    status,
    publish_at: publishAt,
    expired_at: expiredAt,
    published_at: status === NewsStatusTypes.ACTIVE ? now : null,
    archived_at: null,
  });

  try {
    await startNewsLifecycleWorkflow(
      Number(news.id),
      publishAt.toISOString(),
      expiredAt.toISOString(),
    );
  } catch (error) {
    console.error("News Temporal workflow error:", error);

    /*
     * Workflow yaratilmasa news avtomatik
     * active/archive bo‘lmay qoladi.
     */
    await news.destroy({
      force: true,
    });

    throw InternalServerError("NEWS_WORKFLOW_START_FAILED");
  }

  const newsData = news.get({
    plain: true,
  });

  return NewsDTO(newsData);
};

export const UpdateNewsService = async (
  params: NewsParams,
  body: UpdateNewsData,
) => {
  const newsID = Number(params.newsID);

  const news = await NewsModel.findByPk(newsID);

  if (!news) {
    throw NotFound("News not found");
  }

  /*
   * Temporal yoki update xato bo‘lsa,
   * oldingi qiymatlarga qaytish uchun.
   */
  const previousData = {
    title: news.title,
    description: news.description,
    file: news.file,

    status: news.status,

    publish_at: new Date(news.publish_at),
    expired_at: new Date(news.expired_at),

    published_at: news.published_at ? new Date(news.published_at) : null,
    archived_at: news.archived_at ? new Date(news.archived_at) : null,
  };

  /*
   * Status validation.
   */
  if (
    body.status !== undefined &&
    !Object.values(NewsStatusTypes).includes(body.status)
  ) {
    throw BadRequest("News status is invalid");
  }

  /*
   * Archived newsni ACTIVE yoki PLANNED holatiga
   * oddiy update orqali qaytarmaymiz.
   */
  if (
    news.status === NewsStatusTypes.ARCHIVED &&
    body.status !== undefined &&
    body.status !== NewsStatusTypes.ARCHIVED
  ) {
    throw BadRequest("Archived news cannot be reactivated");
  }

  const archiveRequested = body.status === NewsStatusTypes.ARCHIVED;

  let title = news.title;
  let description = news.description;
  let fileID = news.file;

  /*
   * Title.
   */
  if (body.title !== undefined) {
    const parsedTitle = body.title.trim();

    if (!parsedTitle) {
      throw BadRequest("News title is required");
    }

    title = parsedTitle;
  }

  /*
   * Description.
   */
  if (body.description !== undefined) {
    const parsedDescription = body.description.trim();

    if (!parsedDescription) {
      throw BadRequest("News description is required");
    }

    description = parsedDescription;
  }

  /*
   * File:
   *
   * undefined → oldingi file qoladi
   * number    → yangi file tekshiriladi
   */
  if (body.file !== undefined) {
    const parsedFileID = Number(body.file);

    const file = await FileModel.findByPk(parsedFileID, {
      attributes: ["id"],
    });

    if (!file) {
      throw BadRequest("News image not found");
    }

    fileID = parsedFileID;
  }

  /*
   * Frontend faqat sana yuboradi.
   *
   * publish_at:
   * tanlangan kunning 00:00:00.000 Tashkent vaqti.
   */
  const publishAt =
    body.publish_at !== undefined
      ? getTashkentDayStart(body.publish_at, "News publish date")
      : new Date(news.publish_at);

  /*
   * expired_at:
   * tanlangan kunning 23:59:59.999 Tashkent vaqti.
   */
  const expiredAt =
    body.expired_at !== undefined
      ? getTashkentDayEnd(body.expired_at, "News expiration date")
      : new Date(news.expired_at);

  if (Number.isNaN(publishAt.getTime()) || Number.isNaN(expiredAt.getTime())) {
    throw BadRequest("News lifecycle date is invalid");
  }

  /*
   * Bir xil kun ham mumkin:
   *
   * publish:  21.07.2026 00:00
   * expired:  21.07.2026 23:59:59.999
   */
  if (expiredAt.getTime() <= publishAt.getTime()) {
    throw BadRequest("News expiration date must be after publish date");
  }

  const now = new Date();

  /*
   * Manual archive qilinayotgan bo‘lsa,
   * expired_at o‘tgan bo‘lsa ham archive qilishga
   * ruxsat beramiz.
   */
  if (
    !archiveRequested &&
    news.status !== NewsStatusTypes.ARCHIVED &&
    expiredAt.getTime() <= now.getTime()
  ) {
    throw BadRequest("News expiration date must be in the future");
  }

  const lifecycleChanged =
    publishAt.getTime() !== new Date(news.publish_at).getTime() ||
    expiredAt.getTime() !== new Date(news.expired_at).getTime();

  let status = news.status;
  let publishedAt = news.published_at;
  let archivedAt = news.archived_at;

  /*
   * ACTIVE yoki PLANNED news qo‘lda ARCHIVED qilindi.
   */
  if (archiveRequested) {
    status = NewsStatusTypes.ARCHIVED;

    archivedAt = news.archived_at ?? now;

    /*
     * Oldingi published_at saqlanadi.
     * Planned news publish qilinmasdan archive qilinsa null qoladi.
     */
    publishedAt = news.published_at;
  } else if (news.status !== NewsStatusTypes.ARCHIVED && lifecycleChanged) {
    /*
     * ACTIVE va PLANNED status frontdan olinmaydi.
     * Sana bo‘yicha server aniqlaydi.
     */
    status =
      publishAt.getTime() > now.getTime()
        ? NewsStatusTypes.PLANNED
        : NewsStatusTypes.ACTIVE;

    if (status === NewsStatusTypes.PLANNED) {
      publishedAt = null;
    } else {
      /*
       * Oldin ham active bo‘lgan bo‘lsa,
       * published_at saqlanadi.
       */
      publishedAt =
        news.status === NewsStatusTypes.ACTIVE && news.published_at
          ? news.published_at
          : now;
    }

    archivedAt = null;
  }

  await news.update({
    title,
    description,
    file: fileID,

    status,

    publish_at: publishAt,
    expired_at: expiredAt,

    published_at: publishedAt,
    archived_at: archivedAt,
  });

  /*
   * Qaysi Temporal action kerakligini aniqlaymiz.
   */
  const shouldStopWorkflow =
    archiveRequested && previousData.status !== NewsStatusTypes.ARCHIVED;

  const shouldRestartWorkflow =
    !archiveRequested &&
    previousData.status !== NewsStatusTypes.ARCHIVED &&
    lifecycleChanged;

  try {
    /*
     * Manual archive:
     * workflow darhol terminate qilinadi.
     */
    if (shouldStopWorkflow) {
      await cancelNewsLifecycleWorkflows(Array(newsID));
    }

    /*
     * Sana o‘zgardi:
     * eski workflow to‘xtatilib,
     * yangi sana bilan qayta ochiladi.
     */
    if (shouldRestartWorkflow) {
      await restartNewsLifecycleWorkflow(
        newsID,
        publishAt.toISOString(),
        expiredAt.toISOString(),
      );
    }
  } catch (error) {
    console.error("Failed to synchronize news workflow:", error);

    /*
     * Temporal action xato bo‘lsa,
     * DB oldingi holatiga qaytariladi.
     */
    await news.update(previousData);

    /*
     * Eski news active/planned bo‘lgan va
     * expired_at hali tugamagan bo‘lsa,
     * eski workflow qayta tiklanadi.
     */
    if (
      previousData.status !== NewsStatusTypes.ARCHIVED &&
      previousData.expired_at.getTime() > Date.now()
    ) {
      try {
        await restartNewsLifecycleWorkflow(
          newsID,
          previousData.publish_at.toISOString(),
          previousData.expired_at.toISOString(),
        );
      } catch (recoveryError) {
        console.error(
          "Failed to restore previous news workflow:",
          recoveryError,
        );
      }
    }

    throw InternalServerError("Failed to update news lifecycle");
  }

  const updatedNews = await NewsModel.findByPk(newsID);

  if (!updatedNews) {
    throw NotFound("News not found");
  }

  return NewsDTO(
    updatedNews.get({
      plain: true,
    }),
  );
};

export const DeleteNewsService = async (body: DeleteNewsData) => {
  const newsIDs = [...new Set(body.newsIDs.map((newsID) => Number(newsID)))];

  const hasInvalidNewsID = newsIDs.some(
    (newsID) => !Number.isInteger(newsID) || newsID <= 0,
  );

  if (hasInvalidNewsID) {
    throw BadRequest("News IDs are invalid");
  }

  const sequelize = NewsModel.sequelize!;

  const deletedNewsIDs = await sequelize.transaction(async (transaction) => {
    const news = await NewsModel.findAll({
      where: { id: { [Op.in]: newsIDs } },
      attributes: ["id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!news.length) {
      throw NotFound("News not found");
    }

    const existingNewsIDs = news.map((item) => Number(item.id));

    await NewsModel.destroy({
      where: { id: { [Op.in]: existingNewsIDs } },
      force: true,
      transaction,
    });

    return existingNewsIDs;
  });

  await cancelNewsLifecycleWorkflows(deletedNewsIDs);

  return true;
};
