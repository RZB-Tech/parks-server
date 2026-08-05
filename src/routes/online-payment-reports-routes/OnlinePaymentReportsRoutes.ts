import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetOnlinePaymentDailyReportController } from "../../controllers/online-payment-reports-controllers/OnlinePaymentReportsController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { getOnlinePaymentDailyReportSchema } from "./schema";

const OnlinePaymentReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.get(
    "/online-payments/reports/daily",
    {
      schema: getOnlinePaymentDailyReportSchema,
      preHandler: [AuthMiddleware],
    },
    GetOnlinePaymentDailyReportController,
  );
};

export default OnlinePaymentReportsRouter;
