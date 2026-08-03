import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import {
  clientAttractionPaymentSchema,
  getClientTransactionsSchema,
} from "./schema";
import { ClientAttractionPaymentController, GetClientTransactionsController } from "../../../controllers/client/card-transactions-controllers/CardTransactionController";
import {
  ReqData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../../types/routes";

const ClientCardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParamsAndData<ClientAttractionPaymentParams, ReqData<ClientAttractionPaymentData>>>(
    "/attractions/:attractionID/payment",
    {
      schema: clientAttractionPaymentSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    ClientAttractionPaymentController,
  );

  fastify.get<RouteWithQuery<GetClientTransactionsQuery>>(
    "/transactions",
    {
      schema: getClientTransactionsSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    GetClientTransactionsController,
  );
};

export default ClientCardTransactionsRouter;
