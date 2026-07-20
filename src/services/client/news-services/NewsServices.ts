import { WhereOptions } from "sequelize";
import { NewsModel } from "../../../models/postgresql/news-model/NewsModel";
import { BadRequest, NotFound } from "../../../exceptions";
import { ClientNewsDTO } from "../../../dtos/client/news-dtos/NewsDto";

export const ClientGetAllNewsService = async () => {
  const news = await NewsModel.findAll({
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  return news.map((item) => ClientNewsDTO(item.get({ plain: true })));
};

export const ClientGetNewsService = async (params: NewsParams) => {
  const newsID = Number(params.newsID);

  if (!Number.isInteger(newsID) || newsID <= 0) {
    throw BadRequest("News ID is invalid");
  }

  const news = await NewsModel.findByPk(newsID);

  if (!news) {
    throw NotFound("News not found");
  }

  return ClientNewsDTO(news.get({ plain: true }));
};
