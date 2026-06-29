import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  CardTopUpTransactionController,
  CheckNfcCardController,
  GetCashboxCardTransactionsController,
} from "../../controllers/card-transactions-controllers/CardTransactionController";
import { cardTopUpTransactionSchema, checkNfcCardSchema, getCardTransactionsSchema } from "./schema";

const CardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cards/nfc/check",
    { schema: checkNfcCardSchema,preHandler: [AuthMiddleware] },
    CheckNfcCardController,
  );

  fastify.post(
    "/cards/topup",
    { schema: cardTopUpTransactionSchema, preHandler: [AuthMiddleware]},
    CardTopUpTransactionController,
  );

  fastify.get(
    "/cards/cashboxes/:cashboxID/transactions",
    {
      schema: getCardTransactionsSchema,
      preHandler: [AuthMiddleware],
    },
    GetCashboxCardTransactionsController,
  );
};

export default CardTransactionsRouter;
