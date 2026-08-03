import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  CardPaymentTransactionController,
  CardRefundTransactionController,
  CardTopUpTransactionController,
  CheckNfcCardController,
  GetCashboxCardTransactionsController,
} from "../../controllers/card-transactions-controllers/CardTransactionController";
import { cardPaymentTransactionSchema, cardRefundTransactionSchema, cardTopUpTransactionSchema, checkNfcCardSchema, getCardTransactionsSchema } from "./schema";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndQuery,
} from "../../types/routes";

const CardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithData<ReqData<CheckNFCCardData>>>(
    "/cards/nfc/check",
    { schema: checkNfcCardSchema, preHandler: [AuthMiddleware] },
    CheckNfcCardController,
  );

  fastify.post<RouteWithData<ReqData<CardTopUpTransactionData>>>(
    "/cards/topup",
    { schema: cardTopUpTransactionSchema, preHandler: [AuthMiddleware]},
    CardTopUpTransactionController,
  );

  fastify.post(
    "/cards/refund",
    { schema: cardRefundTransactionSchema, preHandler: [AuthMiddleware] },
    CardRefundTransactionController,
  );

  fastify.post<RouteWithData<ReqData<CardPaymentTransactionData>>>(
    "/cards/payment",
    { schema: cardPaymentTransactionSchema, preHandler: [AuthMiddleware] },
    CardPaymentTransactionController,
  );

  fastify.get<RouteWithParamsAndQuery<CashboxParams, GetCashboxCardTransactionsQuery>>(
    "/cards/cashboxes/:cashboxID/transactions",
    {
      schema: getCardTransactionsSchema,
      preHandler: [AuthMiddleware],
    },
    GetCashboxCardTransactionsController,
  );
};

export default CardTransactionsRouter;
