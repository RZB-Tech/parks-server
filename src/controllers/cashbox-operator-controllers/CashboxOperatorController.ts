import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  EmployeeHeaders,
  ReqData,
  RouteWithHeaders,
  RouteWithParams,
  RouteWithParamsAndData,
} from "../../types/routes";
import {
  CreateCashboxOperatorsService,
  DeleteCashboxOperatorsService,
  GetCashboxOperatorByEmployeeService,
} from "../../services/cashbox-operators-services/CashboxOperatorsServices";

export const GetCashboxOperatorByEmployeeController = makeReplyingController(
  "cashbox-operator",
  async (request: FastifyRequest) => {
    const employeeID = request.employee?.id;

    return GetCashboxOperatorByEmployeeService(Number(employeeID));
  },
);

export const CreateCashboxOperatorsController = makeReplyingController(
  "cashbox-operator",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<
        CashboxOperatorParams,
        ReqData<CreateCashboxOperatorData>
      >
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return CreateCashboxOperatorsService(params, body);
  },
);

export const DeleteCashboxOperatorsController = makeReplyingController(
  "success",
  async (request: FastifyRequest<RouteWithParams<CashboxOperatorParams>>) => {
    const params = request.params;

    return DeleteCashboxOperatorsService(params);
  },
);
