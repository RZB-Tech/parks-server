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
import { ClientAttractionPaymentController } from "../../../controllers/client/card-transactions-controllers/CardTransactionController";

const ClientCardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/attractions/:attractionID/payment",
    {
      schema: clientAttractionPaymentSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    ClientAttractionPaymentController,
  );

  fastify.get(
    "/transactions",
    {
      schema: getClientTransactionsSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    GetClientTransactionsController,
  );
};

export default ClientCardTransactionsRouter;
