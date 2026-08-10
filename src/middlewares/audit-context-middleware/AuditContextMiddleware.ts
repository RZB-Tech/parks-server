import { onRequestHookHandler } from "fastify";
import { RunWithAuditRequest } from "../../utils/auditContext";

export const AuditContextMiddleware: onRequestHookHandler = (
  request,
  _reply,
  done,
) => {
  RunWithAuditRequest(request, done);
};
