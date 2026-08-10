import { FastifyRequest } from "fastify";
import { RouteWithQuery } from "../../types/routes";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { GetAuditLogsService } from "../../services/audit-log-services/AuditLogServices";

export const GetAuditLogsController = makeReplyingController(
  ["audit_logs", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetAuditLogsQuery>>) => {
    const query = request.query;

    const result = await GetAuditLogsService(query);

    return [
      result.audit_logs,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);
