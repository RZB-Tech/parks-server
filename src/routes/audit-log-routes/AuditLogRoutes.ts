import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { ExportAuditLogsController, GetAuditLogsController } from "../../controllers/audit-log-controllers/AuditLogController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { exportAuditLogsSchema, getAuditLogsSchema } from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AuditLogsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  const preHandler = [
    AuthMiddleware,
    RoleMiddleware(['superadmin', 'owner', 'director', 'admin', 'head_accountant', 'head_marketing']),
  ];

  fastify.get(
    "/audit-logs",
    {
      schema: getAuditLogsSchema,
      preHandler,
    },
    GetAuditLogsController as any,
  );

  fastify.get<{ Querystring: ExportAuditLogsQuery }>(
    "/audit-logs/export",
    { schema: exportAuditLogsSchema, preHandler },
    ExportAuditLogsController,
  );
};

export default AuditLogsRouter;
