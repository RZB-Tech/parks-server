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
  CreateNewsService,
  DeleteNewsService,
  GetAllNewsService,
  GetNewsService,
  UpdateNewsService,
} from "../../services/news-services/NewsServices";

export const GetAllNewsController = makeReplyingController(
  "news",
  async (request: FastifyRequest<RouteWithQuery<GetAllNewsQuery>>) => {
    const query = request.query;

    return GetAllNewsService(query);
  },
);

export const GetNewsController = makeReplyingController(
  "news",

  async (request: FastifyRequest<RouteWithParams<NewsParams>>) => {
    const params = request.params

    return GetNewsService(params);
  },
);

export const CreateNewsController = makeReplyingController(
  "news",
  async (request: FastifyRequest<RouteWithData<ReqData<CreateNewsData>>>) => {
    const body = request.body.data;

    return CreateNewsService(body);
  },
);

export const UpdateNewsController = makeReplyingController(
  "news",
  async (request: FastifyRequest<RouteWithParamsAndData<NewsParams, ReqData<UpdateNewsData>>>) => {
    const params = request.params;
    const body = request.body.data;

    return UpdateNewsService(params, body);
  },
);

export const DeleteNewsController = makeReplyingController(
  "success",
  async (request: FastifyRequest<RouteWithData<ReqData<DeleteNewsData>>>) => {
    const body = request.body.data;

    return DeleteNewsService(body);
  },
);