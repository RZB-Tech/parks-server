import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";
import {
  CreateAttractionsService,
  DeleteAttractionsService,
  GetAttractionService,
  GetAttractionsService,
  GetAttractionStatsService,
  UpdateAttractionsService,
} from "../../services/attraction-services/AttractionsServices";

export const GetAttractionController = makeReplyingController(
  "attraction",
  async (request: FastifyRequest<RouteWithParams<AttractionParams>>) => {
    const params = request.params;

    return GetAttractionService(params);
  },
);

export const GetAttractionStatsController = makeReplyingController(
  "attraction_stats",
  async (request: FastifyRequest) => {
    return GetAttractionStatsService();
  },
);

export const GetAttractionsController = makeReplyingController(
  ["attractions", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetAttractionsQuery>>) => {
    const query = request.query;
    const result = await GetAttractionsService(query);

    return [
      result.attractions,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    ];
  },
);

export const CreateAttractionsController = makeReplyingController(
  "attraction",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreateAttractionData>>>,
  ) => {
    const body = request.body.data;

    return CreateAttractionsService(body);
  },
);

export const UpdateAttractionsController = makeReplyingController(
  "attraction",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<AttractionParams, ReqData<UpdateAttractionData>>
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return UpdateAttractionsService(params, body);
  },
);

export const DeleteAttractionsController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithData<ReqData<DeleteAttractionsData>>>,
  ) => {
    const body = request.body.data;

    return DeleteAttractionsService(body);
  },
);
