import { FastifyPluginAsync } from "fastify";
import { GetAuditLogsController } from "../../controllers/audit-log-controllers/AuditLogController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { getAuditLogsSchema } from "./schema";

const AuditLogsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/audit-logs",
    {
      schema: getAuditLogsSchema,
      preHandler: [AuthMiddleware],
    },
    GetAuditLogsController as any,
  );
};

export default AuditLogsRouter;
