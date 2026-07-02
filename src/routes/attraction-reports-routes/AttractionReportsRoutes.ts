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
  GetTodayAttractionReportsController,
} from "../../controllers/attraction-reports-controllers/AttractionReportController";
import {
  confirmAttractionZReportsSchema,
  getAccountingAttractionReportsSchema,
  getAttractionZReportsSchema,
  getTodayAttractionReportsSchema,
  openAttractionReportSchema,
  updateAttractionReportStatusSchema,
} from "./schema";

const AttractionReportsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/attractions/:attractionID/reports/open",
    { schema: openAttractionReportSchema, preHandler: [AuthMiddleware] },
    AttractionReportOpenController,
  );

  fastify.put(
    "/attractions/:attractionID/reports/status",
    {
      schema: updateAttractionReportStatusSchema,
      preHandler: [AuthMiddleware],
    },
    CloseAttractionReportController,
  );

  fastify.get(
    "/attractions/:attractionID/reports",
    { schema: getTodayAttractionReportsSchema, preHandler: [AuthMiddleware] },
    GetTodayAttractionReportsController,
  );

  fastify.get(
    "/reports/zreports",
    { schema: getAttractionZReportsSchema, preHandler: [AuthMiddleware] },
    GetAttractionZReportsController,
  );

  fastify.post(
    "/attractions/zreports/confirmation",
    { schema: confirmAttractionZReportsSchema, preHandler: [AuthMiddleware] },
    ConfirmAttractionZReportsController,
  );

  fastify.get(
    "/attractions/reports/accounting",
    { schema: getAccountingAttractionReportsSchema, preHandler: [AuthMiddleware] },
    GetAccountingAttractionReportsController,
  );
};

export default AttractionReportsRouter;
