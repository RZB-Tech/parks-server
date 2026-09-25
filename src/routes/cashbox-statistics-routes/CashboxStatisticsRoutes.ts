import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import {
  GetCashboxTurnoverStatisticsController,
  GetPaymentMethodsStatisticsController,
} from "../../controllers/cashbox-statistics-controllers/CashboxStatisticsController";
import {
  cashboxTurnoverStatisticsSchema,
  paymentMethodsStatisticsSchema,
} from "./schema";
import { RouteWithQuery } from "../../types/routes";

const statisticsRoles = [
  "superadmin",
  "owner",
  "director",
  "head_accountant",
  "head_marketing",
  "head_cashier",
];

const CashboxStatisticsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetCashboxStatisticsQuery>>(
    "/statistics/cashbox-turnover",
    {
      schema: cashboxTurnoverStatisticsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(statisticsRoles)],
    },
    GetCashboxTurnoverStatisticsController,
  );

  fastify.get<RouteWithQuery<GetCashboxStatisticsQuery>>(
    "/statistics/payment-methods",
    {
      schema: paymentMethodsStatisticsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(statisticsRoles)],
    },
    GetPaymentMethodsStatisticsController,
  );
};

export default CashboxStatisticsRouter;
