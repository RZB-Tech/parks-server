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
   * Oldingi ma'lumotlarni Temporal yoki DB update
   * xato bo'lsa qaytarish uchun saqlab olamiz.
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

  let title = news.title;
  let description = news.description;
  let fileID = news.file;

  /*
   * Title
   */
  if (body.title !== undefined) {
    const parsedTitle = body.title.trim();

    if (!parsedTitle) {
      throw BadRequest("News title is required");
    }

    title = parsedTitle;
  }

  /*
   * Description
   */
  if (body.description !== undefined) {
    const parsedDescription = body.description.trim();

    if (!parsedDescription) {
      throw BadRequest("News description is required");
    }

    description = parsedDescription;
  }

  /*
   * Image:
   * undefined → old image qoladi
   * number    → yangi image tekshiriladi
   */
  if (body.file !== undefined) {
    const parsedImageID = Number(body.file);

    if (!Number.isInteger(parsedImageID) || parsedImageID <= 0) {
      throw BadRequest("News image ID is invalid");
    }

    const image = await FileModel.findByPk(parsedImageID, {
      attributes: ["id"],
    });

    if (!image) {
      throw BadRequest("News image not found");
    }

    fileID = parsedImageID;
  }

  /*
   * Final publish_at
   */
  const publishAt =
    body.publish_at !== undefined
      ? new Date(body.publish_at)
      : new Date(news.publish_at);

  if (Number.isNaN(publishAt.getTime())) {
    throw BadRequest("News publish date is invalid");
  }

  /*
   * Final expired_at
   */
  const expiredAt =
    body.expired_at !== undefined
      ? new Date(body.expired_at)
      : new Date(news.expired_at);

  if (Number.isNaN(expiredAt.getTime())) {
    throw BadRequest("News expiration date is invalid");
  }

  if (expiredAt.getTime() <= publishAt.getTime()) {
    throw BadRequest("News expiration date must be after publish date");
  }

  const now = new Date();

  if (expiredAt.getTime() <= now.getTime()) {
    throw BadRequest("News expiration date must be in the future");
  }

  /*
   * Temporal workflow faqat lifecycle vaqtlari
   * haqiqatdan o'zgarganida restart bo'ladi.
   */
  const lifecycleChanged =
    publishAt.getTime() !== new Date(news.publish_at).getTime() ||
    expiredAt.getTime() !== new Date(news.expired_at).getTime();

  let status = news.status;
  let publishedAt = news.published_at;
  let archivedAt = news.archived_at;

  if (lifecycleChanged) {
    status =
      publishAt.getTime() > now.getTime()
        ? NewsStatusTypes.PLANNED
        : NewsStatusTypes.ACTIVE;

    if (status === NewsStatusTypes.PLANNED) {
      publishedAt = null;
    } else {
      /*
       * Active news active holatda qolayotgan bo'lsa
       * oldingi published_at saqlanadi.
       *
       * Planned/archived news active bo'layotgan bo'lsa
       * yangi published_at qo'yiladi.
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

  if (lifecycleChanged) {
    try {
      await restartNewsLifecycleWorkflow(
        newsID,
        publishAt.toISOString(),
        expiredAt.toISOString(),
      );
    } catch (error) {
      console.error("Failed to restart news workflow:", error);

      /*
       * Yangi Temporal workflow ochilmasa,
       * DB qiymatlarini oldingi holatiga qaytaramiz.
       */
      await news.update(previousData);

      /*
       * Oldingi workflow terminate bo'lgan bo'lishi mumkin.
       * Oldingi news hali active/planned va muddati
       * tugamagan bo'lsa workflow'ni qayta tiklaymiz.
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
