import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { ForceCloseReportsController } from "../../controllers/report-management-controllers/ReportManagementController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { RouteWithParams } from "../../types/routes";
import { forceCloseReportsSchema } from "./schema";

const ReportManagementRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.put<RouteWithParams<ForceCloseReportsParams>>(
    "/reports/:source/:sourceID/force-close",
    {
      schema: forceCloseReportsSchema,
      preHandler: [
        AuthMiddleware,
        RoleMiddleware(["superadmin", "head_cashier"]),
      ],
    },
    ForceCloseReportsController,
  );
};

export default ReportManagementRouter;
