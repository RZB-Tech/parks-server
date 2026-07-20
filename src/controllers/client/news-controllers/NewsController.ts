import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../../utils/controllerHelpers";
import { RouteWithParams } from "../../../types/routes";
import {
  ClientGetAllNewsService,
  ClientGetNewsService,
} from "../../../services/client/news-services/NewsServices";

export const ClientGetAllNewsController = makeReplyingController(
  "news",
  async (request: FastifyRequest) => {
    return ClientGetAllNewsService();
  },
);

export const ClientGetNewsController = makeReplyingController(
  "news",
  async (request: FastifyRequest<RouteWithParams<NewsParams>>) => {
    const params = request.params;

    return ClientGetNewsService(params);
  },
);
