import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithParams, RouteWithParamsAndData } from "../../types/routes";
import { CreateAttractionOperatorsService, DeleteAttractionOperatorsService } from "../../services/attraction-operators-services/AttractionOperatorsServices";

export const CreateAttractionOperatorsController = makeReplyingController(
  "attraction-operator",
  async (
    request: FastifyRequest<RouteWithParamsAndData<AttractionOperatorParams, ReqData<CreateAttractionOperatorData>>>,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return CreateAttractionOperatorsService(params, body);
  },
);

export const DeleteAttractionOperatorsController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<
      RouteWithParams<AttractionOperatorParams>
    >,
  ) => {
    const params = request.params;

    return DeleteAttractionOperatorsService(params);
  },
);
