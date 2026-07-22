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
  CreatePromotionService,
  DeletePromotionsService,
  GetAllPromotionsService,
  GetPromotionService,
  UpdatePromotionService,
} from "../../services/promotion-services/PromotionServices";

export const GetAllPromotionsController = makeReplyingController(
  "promotions",
  async (request: FastifyRequest<RouteWithQuery<GetPromotionsQuery>>) => {
    const query = request.query;

    return await GetAllPromotionsService(query);
  },
);

export const GetPromotionController = makeReplyingController(
  "promotion",
  async (request: FastifyRequest<RouteWithParams<PromotionParams>>) => {
    const params = request.params;

    return await GetPromotionService(params);
  },
);

export const CreatePromotionController = makeReplyingController(
  "promotion",
  async (
    request: FastifyRequest<RouteWithData<ReqData<CreatePromotionData>>>,
  ) => {
    const body = request.body.data;

    return CreatePromotionService(body);
  },
);

export const UpdatePromotionController = makeReplyingController(
  "promotion",
  async (
    request: FastifyRequest<
      RouteWithParamsAndData<PromotionParams, ReqData<UpdatePromotionData>>
    >,
  ) => {
    const params = request.params;
    const body = request.body.data;

    return await UpdatePromotionService(params, body);
  },
);

export const DeletePromotionController = makeReplyingController(
  "success",
  async (
    request: FastifyRequest<RouteWithData<ReqData<DeletePromotionsData>>>,
  ) => {
    const body = request.body.data;

    return DeletePromotionsService(body);
  },
);
