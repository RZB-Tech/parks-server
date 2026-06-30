import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

import { CashboxReportOpenController, CashboxReportsTodayController, CloseCashboxReportController, ConfirmZReportsController, GetAccountingCashboxReportsController, GetZReportsController, ReopenZReportsController } from "../../controllers/cashbox-reports-controllers/CashboxReportController";
import { cashboxReportsTodaySchema, closeReportSchema, confirmZReportsSchema, getAccountingCashboxReportsSchema, getZReportsSchema, openReportSchema, reopenZReportsSchema } from "./schema";

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

  fastify.post(
    "/cashboxes/:cashboxID/reports/close",
    { schema: closeReportSchema, preHandler: [AuthMiddleware] },
    CloseCashboxReportController,
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

   fastify.post(
     "/zreports/reopen",
     { schema: reopenZReportsSchema, preHandler: [AuthMiddleware] },
     ReopenZReportsController,
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
