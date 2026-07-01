import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { AttractionReportOpenController, CloseAttractionReportController, GetAttractionZReportsController, GetTodayAttractionReportsController } from "../../controllers/attraction-reports-controllers/AttractionReportController";
import { getAttractionZReportsSchema, getTodayAttractionReportsSchema, openAttractionReportSchema, updateAttractionReportStatusSchema } from "./schema";

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
    {schema: updateAttractionReportStatusSchema, preHandler: [AuthMiddleware]},
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

};

export default AttractionReportsRouter;
