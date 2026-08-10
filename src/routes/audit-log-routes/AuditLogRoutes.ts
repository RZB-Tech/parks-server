import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { GetAuditLogsController } from "../../controllers/audit-log-controllers/AuditLogController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { getAuditLogsSchema } from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AuditLogsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/audit-logs",
    {
      schema: getAuditLogsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'head_accountant', 'head_marketing'])],
    },
    GetAuditLogsController as any,
  );
};

export default AuditLogsRouter;
