import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  AttractionReportOpenController,
  CloseAttractionReportController,
  ConfirmAttractionZReportsController,
  GetAccountingAttractionReportsController,
  GetAttractionZReportsController,
  GetNotConfirmedAttractionZReportDatesController,
  GetTodayAttractionReportsController,
} from "../../controllers/attraction-reports-controllers/AttractionReportController";
import {
  confirmAttractionZReportsSchema,
  getAccountingAttractionReportsSchema,
  getAttractionZReportsSchema,
  getNotConfirmedAttractionZReportDatesSchema,
  getTodayAttractionReportsSchema,
  openAttractionReportSchema,
  updateAttractionReportStatusSchema,
} from "./schema";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndData,
  RouteWithParamsAndHeaders,
  RouteWithParamsAndQuery,
  RouteWithQuery,
} from "../../types/routes";

const AttractionReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParamsAndHeaders<AttractionReportParams, AttractionReportHeaders>>(
    "/attractions/:attractionID/reports/open",
    { schema: openAttractionReportSchema, preHandler: [AuthMiddleware] },
    AttractionReportOpenController,
  );

  fastify.put<RouteWithParamsAndData<AttractionReportParams, ReqData<UpdateAttractionReportStatusData>>>(
    "/attractions/:attractionID/reports/:reportID/status",
    {
      schema: updateAttractionReportStatusSchema,
      preHandler: [AuthMiddleware],
    },
    CloseAttractionReportController,
  );

  fastify.get<RouteWithParamsAndQuery<AttractionReportParams, GetAttractionReportsQuery>>(
    "/attractions/:attractionID/reports",
    { schema: getTodayAttractionReportsSchema, preHandler: [AuthMiddleware] },
    GetTodayAttractionReportsController,
  );

  fastify.get<RouteWithQuery<GetAttractionZReportsQuery>>(
    "/attraction/zreports",
    { schema: getAttractionZReportsSchema, preHandler: [AuthMiddleware] },
    GetAttractionZReportsController,
  );

  fastify.post<RouteWithData<ReqData<ConfirmAttractionZReportsData>>>(
    "/attractions/zreports/confirmation",
    { schema: confirmAttractionZReportsSchema, preHandler: [AuthMiddleware] },
    ConfirmAttractionZReportsController,
  );

  fastify.get<RouteWithQuery<GetAccountingAttractionReportsQuery>>(
    "/attractions/reports/accounting",
    { schema: getAccountingAttractionReportsSchema, preHandler: [AuthMiddleware] },
    GetAccountingAttractionReportsController,
  );

  fastify.get(
    "/attraction/notconfirmed/zreports/dates",
    {
      schema: getNotConfirmedAttractionZReportDatesSchema, preHandler: [AuthMiddleware],
    },
    GetNotConfirmedAttractionZReportDatesController,
  );
};

export default AttractionReportsRouter;
