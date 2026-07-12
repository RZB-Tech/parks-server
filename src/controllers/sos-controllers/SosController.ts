import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithParams, RouteWithParamsAndData, RouteWithQuery } from "../../types/routes";
import { CreateSOSService, GetSOSReportsService } from "../../services/sos-services/SosServices";

export const CreateSosController = makeReplyingController(
  "sos",
  async (request: FastifyRequest<RouteWithParamsAndData<SosParams, ReqData<CreateSOSData>>>) => {
    const operatorID = Number(request.employee?.id);
    const params = request.params;
    const body = request.body.data;

    return CreateSOSService(operatorID, params, body);
  },
);

export const GetSOSReportsController = makeReplyingController(
  "sos",
  async (
    request: FastifyRequest<RouteWithQuery<GetSOSReportsQuery>>,
  ) => {
    const query = request.query
    return GetSOSReportsService(query);
  },
);