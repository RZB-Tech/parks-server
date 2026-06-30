import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithParams, RouteWithParamsAndData } from "../../types/routes";
import { CreateAttractionOperatorsService, DeleteAttractionOperatorsService, GetOperatorAttractionService, GetOperatorAttractionsService } from "../../services/attraction-operators-services/AttractionOperatorsServices";


export const GetOperatorAttractionsController = makeReplyingController(
  "operator-attractions",
  async (
    request: FastifyRequest,
  ) => {
    const operatorID = request.employee?.id

    return GetOperatorAttractionsService(Number(operatorID));
  },
);

export const GetOperatorAttractionController = makeReplyingController(
  "operator-attraction",
  async (
    request: FastifyRequest<RouteWithParams<AttractionOperatorParams>>,
  ) => {
    const operatorID = request.employee?.id
    const params = request.params

    return GetOperatorAttractionService(Number(operatorID), params);
  },
);

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
