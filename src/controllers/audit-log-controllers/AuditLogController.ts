import { FastifyRequest } from "fastify";
import { RouteWithQuery } from "../../types/routes";
import { makeReplyingController, withErrorHandler } from "../../utils/controllerHelpers";
import { ExportAuditLogsService, GetAuditLogsService } from "../../services/audit-log-services/AuditLogServices";

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

export const ExportAuditLogsController = withErrorHandler<
  FastifyRequest<RouteWithQuery<ExportAuditLogsQuery>>
>(async (request, reply) => {
  const result = await ExportAuditLogsService(request.query);

  return reply
    .type("application/json; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${result.filename}"`)
    .header("Cache-Control", "no-store")
    .send(result.stream);
});
