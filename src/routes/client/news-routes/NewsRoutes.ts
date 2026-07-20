import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { clientGetAllNewsSchema, clientGetNewsSchema } from "./schema";
import { ClientGetAllNewsController } from "../../../controllers/client/news-controllers/NewsController";
import { ClientGetAllNewsService } from "../../../services/client/news-services/NewsServices";

const ClientNewsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/news",
    { schema: clientGetAllNewsSchema, preHandler: [TelegramAuthMiddleware] },
    ClientGetAllNewsController,
  );

  fastify.get(
    "/news/:newsID",
    { schema: clientGetNewsSchema, preHandler: [TelegramAuthMiddleware] },
    ClientGetAllNewsService,
  );
};

export default ClientNewsRouter;
