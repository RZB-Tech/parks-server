import { FastifyRequest } from "fastify";
import { ForceCloseReportsService } from "../../services/report-management-services/ReportManagementServices";
import { RouteWithParams } from "../../types/routes";
import { makeReplyingController } from "../../utils/controllerHelpers";

export const ForceCloseReportsController = makeReplyingController(
  "force-close-result",
  async (
    request: FastifyRequest<RouteWithParams<ForceCloseReportsParams>>,
  ) => ForceCloseReportsService(request.params),
);
