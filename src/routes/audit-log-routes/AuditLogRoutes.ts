import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { GetAuditLogsController } from "../../controllers/audit-log-controllers/AuditLogController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { getAuditLogsSchema } from "./schema";

const AuditLogsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
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
