import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

import { CashboxReportOpenController, CashboxReportsTodayController, ConfirmZReportsController, GetAccountingCashboxReportsController, GetZReportsController, StatusCashboxReportController } from "../../controllers/cashbox-reports-controllers/CashboxReportController";
import { cashboxReportsTodaySchema, confirmZReportsSchema, getAccountingCashboxReportsSchema, getZReportsSchema, openReportSchema, statusCashboxReportSchema } from "./schema";

const CashboxReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cashboxes/:cashboxID/reports/open",
    { schema: openReportSchema, preHandler: [AuthMiddleware] },
    CashboxReportOpenController,
  );

  fastify.get(
    "/cashboxes/:cashboxID/reports",
    { schema: cashboxReportsTodaySchema, preHandler: [AuthMiddleware] },
    CashboxReportsTodayController,
  );

  fastify.put(
    "/cashboxes/:cashboxID/reports/status",
    { schema: statusCashboxReportSchema, preHandler: [AuthMiddleware] },
    StatusCashboxReportController,
  );

   fastify.get(
     "/zreports",
     { schema: getZReportsSchema, preHandler: [AuthMiddleware] },
     GetZReportsController,
   );

   fastify.post(
     "/zreports/confirmation",
     { schema: confirmZReportsSchema, preHandler: [AuthMiddleware] },
     ConfirmZReportsController,
   );
   
   fastify.get(
     "/accounting/cashbox-reports",
     {
       schema: getAccountingCashboxReportsSchema,
       preHandler: [AuthMiddleware],
     },
     GetAccountingCashboxReportsController,
   );
};

export default CashboxReportsRouter;
