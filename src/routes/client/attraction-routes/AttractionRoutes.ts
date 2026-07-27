import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import {
  GetAttractionRoundController,
  GetClientAttractionController,
  GetClientAttractionsController,
} from "../../../controllers/client/attraction-controllers/AttractionController";
import {
  getClientAttractionSchema,
  getClientAttractionRoundSchema,
  getClientAttractionsSchema,
} from "./schema";

const ClientAttractionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions",
    {
      schema: getClientAttractionsSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    GetClientAttractionsController,
  );

  fastify.get(
    "/attractions/:attractionID",
    {
      schema: getClientAttractionSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    GetClientAttractionController,
  );

  fastify.get(
    "/attractions/:attractionID/round",
    {
      schema: getClientAttractionRoundSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    GetAttractionRoundController,
  );
};

export default ClientAttractionsRouter;
