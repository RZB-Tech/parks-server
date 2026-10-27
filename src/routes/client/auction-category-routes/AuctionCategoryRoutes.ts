import { FastifyPluginAsync } from "fastify";
import { GetClientAuctionCategoriesController } from "../../../controllers/auction-category-controllers/AuctionCategoryController";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { getClientAuctionCategoriesSchema } from "./schema";
import { GetClientAuctionCategoryCardsController } from "../../../controllers/auction-category-controllers/AuctionCardController";
import { getClientAuctionCategoryCardsSchema } from "../../auction-category-routes/cardSchema";
import { RouteWithParamsAndQuery } from "../../../types/routes";

const ClientAuctionCategoryRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get<RouteWithParamsAndQuery<AuctionCategoryParams, GetAuctionCategoryCardsQuery>>(
    "/auction-categories/:categoryID/cards",
    { schema: getClientAuctionCategoryCardsSchema, preHandler: [TelegramAuthMiddleware] },
    GetClientAuctionCategoryCardsController,
  );
  fastify.get(
    "/auction-categories",
    { schema: getClientAuctionCategoriesSchema, preHandler: [TelegramAuthMiddleware] },
    GetClientAuctionCategoriesController,
  );
};

export default ClientAuctionCategoryRouter;
