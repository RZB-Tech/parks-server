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
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const CardTransactionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cards/nfc/check",
    { schema: checkNfcCardSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'head_accountant', 'head_marketing', 'head_cashier', 'cashier', 'head_operator', 'operator'])] },
    CheckNfcCardController,
  );

  fastify.post(
    "/cards/topup",
    { schema: cardTopUpTransactionSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'cashier', 'head_cashier', 'head_operator'])]},
    CardTopUpTransactionController,
  );

  fastify.post(
    "/cards/refund",
    { schema: cardRefundTransactionSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'head_accountant', 'head_marketing', 'head_cashier', 'cashier', 'head_operator', 'operator'])] },
    CardRefundTransactionController,
  );

  fastify.get(
    "/cards/refunds",
    { schema: getCardReturnsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_cashier', 'cashier', 'head_operator', 'operator'])] },
    GetCardReturnsController,
  );

  fastify.post(
    "/cards/payment",
    { schema: cardPaymentTransactionSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_cashier', 'head_operator', 'operator'])] },
    CardPaymentTransactionController,
  );

  fastify.get(
    "/cards/cashboxes/:cashboxID/transactions",
    {
      schema: getCardTransactionsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_cashier', 'cashier', 'head_operator', 'operator'])],
    },
    GetCashboxCardTransactionsController,
  );
};

export default CardTransactionsRouter;
