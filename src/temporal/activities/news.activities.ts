import { Op } from "sequelize";
import { NewsModel } from "../../models/postgresql/news-model/NewsModel";
import { NewsStatusTypes } from "../../models/postgresql/news-model/enums";

export const activateNewsActivity = async (newsID: number) => {
  const now = new Date();

  await NewsModel.update(
    {
      status: NewsStatusTypes.ACTIVE,
      published_at: now,
      archived_at: null,
    },
    {
      where: {
        id: newsID,
        status: NewsStatusTypes.PLANNED,
        publish_at: { [Op.lte]: now },
        expired_at: { [Op.gt]: now },
      },
    },
  );
};

export const archiveNewsActivity = async (newsID: number) => {
  const now = new Date();

  await NewsModel.update(
    {
      status: NewsStatusTypes.ARCHIVED,
      archived_at: now,
    },
    {
      where: {
        id: newsID,
        status: { [Op.in]: [NewsStatusTypes.PLANNED, NewsStatusTypes.ACTIVE] },
        expired_at: { [Op.lte]: now },
      },
    },
  );
};
