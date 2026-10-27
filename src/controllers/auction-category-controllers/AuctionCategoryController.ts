import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData, RouteWithParams, RouteWithParamsAndData, RouteWithQuery } from "../../types/routes";
import {
  CreateAuctionCategoryService,
  DeleteAuctionCategoryService,
  GetAuctionCategoriesService,
  GetAuctionCategoryService,
  GetClientAuctionCategoriesService,
  UpdateAuctionCategoryService,
} from "../../services/auction-category-services/AuctionCategoryServices";

export const GetAuctionCategoriesController = makeReplyingController(
  ["categories", "pagination"],
  async (request: FastifyRequest<RouteWithQuery<GetAuctionCategoriesQuery>>) => {
    const result = await GetAuctionCategoriesService(request.query);
    return [result.categories, result.pagination];
  },
);

export const GetAuctionCategoryController = makeReplyingController(
  "category",
  async (request: FastifyRequest<RouteWithParams<AuctionCategoryParams>>) =>
    GetAuctionCategoryService(request.params),
);

export const CreateAuctionCategoryController = makeReplyingController(
  "category",
  async (request: FastifyRequest<RouteWithData<ReqData<CreateAuctionCategoryData>>>) =>
    CreateAuctionCategoryService(request.body.data),
);

export const UpdateAuctionCategoryController = makeReplyingController(
  "category",
  async (request: FastifyRequest<RouteWithParamsAndData<AuctionCategoryParams, ReqData<UpdateAuctionCategoryData>>>) =>
    UpdateAuctionCategoryService(request.params, request.body.data),
);

export const DeleteAuctionCategoryController = makeReplyingController(
  "success",
  async (request: FastifyRequest<RouteWithParams<AuctionCategoryParams>>) =>
    DeleteAuctionCategoryService(request.params),
);

export const GetClientAuctionCategoriesController = makeReplyingController(
  "categories",
  async () => GetClientAuctionCategoriesService(),
);
