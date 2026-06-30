import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { AttractionReportOpenController, CloseAttractionReportController } from "../../controllers/attraction-reports-controllers/AttractionReportController";
import { openAttractionReportSchema, updateAttractionReportStatusSchema } from "./schema";

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

};

export default AttractionReportsRouter;
