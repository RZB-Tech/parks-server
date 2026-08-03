import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

import { CashboxReportOpenController, CashboxReportsTodayController, ConfirmZReportsController, GetAccountingCashboxReportsController, GetNotConfirmedZReportDatesController, GetZReportsController, StatusCashboxReportController } from "../../controllers/cashbox-reports-controllers/CashboxReportController";
import { cashboxReportsTodaySchema, confirmZReportsSchema, getAccountingCashboxReportsSchema, getNotConfirmedZReportDatesSchema, getZReportsSchema, openReportSchema, statusCashboxReportSchema } from "./schema";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const CashboxReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParams<CashboxReportsParams>>(
    "/cashboxes/:cashboxID/reports/open",
    { schema: openReportSchema, preHandler: [AuthMiddleware] },
    CashboxReportOpenController,
  );

  fastify.get(
    "/cashboxes/:cashboxID/reports",
    { schema: cashboxReportsTodaySchema, preHandler: [AuthMiddleware] },
    CashboxReportsTodayController,
  );

  fastify.put<RouteWithParamsAndData<CashboxReportsParams, ReqData<CloseCashboxReportData>>>(
    "/cashboxes/:cashboxID/reports/status",
    { schema: statusCashboxReportSchema, preHandler: [AuthMiddleware] },
    StatusCashboxReportController,
  );

   fastify.get<RouteWithQuery<GetZReportsQuery>>(
     "/cashbox/zreports",
     { schema: getZReportsSchema, preHandler: [AuthMiddleware] },
     GetZReportsController,
   );

   fastify.post<RouteWithData<ReqData<ConfirmZReportsData>>>(
     "/zreports/confirmation",
     { schema: confirmZReportsSchema, preHandler: [AuthMiddleware] },
     ConfirmZReportsController,
   );

   fastify.get<RouteWithQuery<GetAccountingCashboxReportsQuery>>(
     "/accounting/cashbox-reports",
     {
       schema: getAccountingCashboxReportsSchema,
       preHandler: [AuthMiddleware],
     },
     GetAccountingCashboxReportsController,
   );

   fastify.get(
     "/cashbox/notconfirmed/zreports/dates",
     { schema: getNotConfirmedZReportDatesSchema, preHandler: [AuthMiddleware] },
     GetNotConfirmedZReportDatesController,
   );
};

export default CashboxReportsRouter;
