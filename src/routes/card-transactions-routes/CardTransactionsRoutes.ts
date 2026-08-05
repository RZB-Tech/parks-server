import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RouteWithQuery } from "../../types/routes";
import {
  CardPaymentTransactionController,
  CardRefundTransactionController,
  CardTopUpTransactionController,
  CheckNfcCardController,
  GetCardReturnsController,
  GetCashboxCardTransactionsController,
} from "../../controllers/card-transactions-controllers/CardTransactionController";
import {
  cardPaymentTransactionSchema,
  cardRefundTransactionSchema,
  cardTopUpTransactionSchema,
  checkNfcCardSchema,
  getCardReturnsSchema,
  getCardTransactionsSchema,
} from "./schema";

const CardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cards/nfc/check",
    { schema: checkNfcCardSchema, preHandler: [AuthMiddleware] },
    CheckNfcCardController,
  );

  fastify.post(
    "/cards/topup",
    { schema: cardTopUpTransactionSchema, preHandler: [AuthMiddleware]},
    CardTopUpTransactionController,
  );

  fastify.post(
    "/cards/refund",
    { schema: cardRefundTransactionSchema, preHandler: [AuthMiddleware] },
    CardRefundTransactionController,
  );

  fastify.get<RouteWithQuery<GetCardReturnsQuery>>(
    "/cards/refunds",
    { schema: getCardReturnsSchema, preHandler: [AuthMiddleware] },
    GetCardReturnsController,
  );

  fastify.post(
    "/cards/payment",
    { schema: cardPaymentTransactionSchema, preHandler: [AuthMiddleware] },
    CardPaymentTransactionController,
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
