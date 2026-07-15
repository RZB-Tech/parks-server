import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { createVirtualCardSchema, getUserCardsSchema } from "./schema";
import { CreateVirtualCardController, GetUserCardsController } from "../../../controllers/client/card-controllers/CardController";

const ClientCardsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cards",
    { schema: getUserCardsSchema, preHandler: [TelegramAuthMiddleware] },
    GetUserCardsController,
  );

  fastify.post(
    "/cards/virtual",
    { schema: createVirtualCardSchema, preHandler: [TelegramAuthMiddleware] },
    CreateVirtualCardController,
  );
};

export default ClientCardsRouter;
