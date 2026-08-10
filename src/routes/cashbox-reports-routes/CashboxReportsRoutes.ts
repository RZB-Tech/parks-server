import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

import { CashboxReportOpenController, CashboxReportsTodayController, ConfirmZReportsController, GetAccountingCashboxReportsController, GetNotConfirmedZReportDatesController, GetZReportsController, StatusCashboxReportController } from "../../controllers/cashbox-reports-controllers/CashboxReportController";
import { cashboxReportsTodaySchema, confirmZReportsSchema, getAccountingCashboxReportsSchema, getNotConfirmedZReportDatesSchema, getZReportsSchema, openReportSchema, statusCashboxReportSchema } from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const CashboxReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cashboxes/:cashboxID/reports/open",
    { schema: openReportSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_cashier', 'cashier' ])] },
    CashboxReportOpenController,
  );

  fastify.get(
    "/cashboxes/:cashboxID/reports",
    { schema: cashboxReportsTodaySchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_cashier', 'cashier', 'head_accountant', 'head_marketing' ])] },
    CashboxReportsTodayController,
  );

  fastify.put(
    "/cashboxes/:cashboxID/reports/status",
    { schema: statusCashboxReportSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_cashier', 'cashier', 'head_accountant', 'head_marketing' ])] },
    StatusCashboxReportController,
  );

   fastify.get(
     "/cashbox/zreports",
     { schema: getZReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_cashier', 'cashier', 'head_accountant', 'head_marketing' ])] },
     GetZReportsController,
   );

   fastify.post(
     "/zreports/confirmation",
     { schema: confirmZReportsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_cashier', 'head_accountant', 'head_marketing' ])] },
     ConfirmZReportsController,
   );
   
   fastify.get(
     "/accounting/cashbox-reports",
     {
       schema: getAccountingCashboxReportsSchema,
       preHandler: [AuthMiddleware, RoleMiddleware(["superadmin",'head_accountant','head_marketing' ])],
     },
     GetAccountingCashboxReportsController,
   );

   fastify.get(
     "/cashbox/notconfirmed/zreports/dates",
     { schema: getNotConfirmedZReportDatesSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'head_accountant', 'head_marketing', 'head_cashier' ])] },
     GetNotConfirmedZReportDatesController,
   );
};

export default CashboxReportsRouter;
