import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetClientPromotionsController } from "../../../controllers/client/promotion-controllers/PromotionController";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { getClientPromotionsSchema } from "./schema";

const ClientPromotionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/promotions",
    {schema: getClientPromotionsSchema, preHandler: [TelegramAuthMiddleware]},
    GetClientPromotionsController,
  );
};

export default ClientPromotionsRouter;
