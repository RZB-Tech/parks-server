import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetOnlinePaymentDailyReportController } from "../../controllers/online-payment-reports-controllers/OnlinePaymentReportsController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { getOnlinePaymentDailyReportSchema } from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const OnlinePaymentReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.get(
    "/online-payments/reports/daily",
    {
      schema: getOnlinePaymentDailyReportSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'owner', 'director', 'head_accountant', 'head_marketing','head_cashier'])],
    },
    GetOnlinePaymentDailyReportController,
  );
};

export default OnlinePaymentReportsRouter;
