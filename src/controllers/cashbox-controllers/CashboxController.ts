import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData, RouteWithParams, RouteWithParamsAndData, RouteWithQuery } from "../../types/routes";
import { CreateCashboxesService, DeleteCashboxesService, GetCashboxesService, GetCashboxService, GetCashboxStatsService, UpdateCashboxesService } from "../../services/cashbox-services/CashboxServices";

export const GetCashboxController = makeReplyingController(
  "cashbox",
  async (request: FastifyRequest<RouteWithQuery<GetCashboxQuery>>) => {
    const operatorID = request.employee?.id;
    const query = request.query;

    return GetCashboxService(Number(operatorID), query);
  },
);

export const GetCashboxStatsController = makeReplyingController(
  "cashbox_stats",
  async (request: FastifyRequest) => {
    return GetCashboxStatsService();
  },
);

export const GetCashboxesController = makeReplyingController(
  ["cashboxes", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetCashboxesQuery>>) => {
    const query = request.query;
    const result = await GetCashboxesService(query);

    return [
      result.cashboxes,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

export const CreateCashboxesController = makeReplyingController(
  "cashbox",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateCashboxData>>>,
  ) => {
    const body = request.body.data;

    return CreateCashboxesService(body);
  },
);

export const UpdateCashboxesController = makeReplyingController(
  "cashbox",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<CashboxParams, ReqData<UpdateCashboxData>>
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return UpdateCashboxesService(params, body);
  },
);

export const DeleteCashboxesController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithData<ReqData<DeleteCashboxesData>>>,
  ) => {
    const body = request.body.data;

    return DeleteCashboxesService(body);
  },
);
