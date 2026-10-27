import { FastifyRequest } from "fastify";
import { makeReplyingController } from "../../utils/controllerHelpers";
import { ReqData, RouteWithData, RouteWithParamsAndQuery } from "../../types/routes";
import {
  AssignAuctionCardsService,
  GetAuctionCategoryCardsService,
  RemoveAuctionCardsService,
} from "../../services/auction-category-services/AuctionCardServices";

export const AssignAuctionCardsController = makeReplyingController(
  "cards",
  async (request: FastifyRequest<RouteWithData<ReqData<AuctionCategoryCardsData>>>) =>
    AssignAuctionCardsService(request.body.data),
);

export const RemoveAuctionCardsController = makeReplyingController(
  "cards",
  async (request: FastifyRequest<RouteWithData<ReqData<AuctionCategoryCardsData>>>) =>
    RemoveAuctionCardsService(request.body.data),
);

const listController = (client: boolean) => makeReplyingController(
  ["category", "cards", "pagination"],
  async (request: FastifyRequest<RouteWithParamsAndQuery<AuctionCategoryParams, GetAuctionCategoryCardsQuery>>) => {
    const result = await GetAuctionCategoryCardsService(request.params, request.query, client);
    return [result.category, result.cards, result.pagination];
  },
);

export const GetAuctionCategoryCardsController = listController(false);
export const GetClientAuctionCategoryCardsController = listController(true);
