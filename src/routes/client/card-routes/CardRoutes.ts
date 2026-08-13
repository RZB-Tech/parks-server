import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import {
  bindCardSchema,
  createVirtualCardSchema,
  getUserCardsSchema,
} from "./schema";
import {
  BindCardController,
  CreateVirtualCardController,
  GetUserCardsController,
} from "../../../controllers/client/card-controllers/CardController";
import { CardBindRateLimitMiddleware } from "../../../middlewares/card-bind-rate-limit-middleware/CardBindRateLimitMiddleware";
import { ReqData, RouteWithData } from "../../../types/routes";

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

  fastify.post<RouteWithData<ReqData<BindCardData>>>(
    "/cards/bind",
    {
      schema: bindCardSchema,
      preHandler: [TelegramAuthMiddleware, CardBindRateLimitMiddleware],
    },
    BindCardController,
  );
};

export default ClientCardsRouter;
