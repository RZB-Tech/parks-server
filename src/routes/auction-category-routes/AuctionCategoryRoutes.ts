import { FastifyPluginAsync } from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import {
  CreateAuctionCategoryController,
  DeleteAuctionCategoryController,
  GetAuctionCategoriesController,
  GetAuctionCategoryController,
  UpdateAuctionCategoryController,
} from "../../controllers/auction-category-controllers/AuctionCategoryController";
import { ReqData, RouteWithData, RouteWithParams, RouteWithParamsAndData, RouteWithParamsAndQuery, RouteWithQuery } from "../../types/routes";
import { AssignAuctionCardsController, GetAuctionCategoryCardsController, RemoveAuctionCardsController } from "../../controllers/auction-category-controllers/AuctionCardController";
import { assignAuctionCardsSchema, getAuctionCategoryCardsSchema, removeAuctionCardsSchema } from "./cardSchema";
import {
  createAuctionCategorySchema,
  deleteAuctionCategorySchema,
  getAuctionCategoriesSchema,
  getAuctionCategorySchema,
  updateAuctionCategorySchema,
} from "./schema";

const AuctionCategoryRouter: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", AuthMiddleware);
  fastify.addHook("preHandler", RoleMiddleware(["superadmin", "director"]));

  fastify.post<RouteWithData<ReqData<AuctionCategoryCardsData>>>(
    "/auction-categories/cards", { schema: assignAuctionCardsSchema }, AssignAuctionCardsController,
  );
  fastify.delete<RouteWithData<ReqData<AuctionCategoryCardsData>>>(
    "/auction-categories/cards", { schema: removeAuctionCardsSchema }, RemoveAuctionCardsController,
  );
  fastify.get<RouteWithParamsAndQuery<AuctionCategoryParams, GetAuctionCategoryCardsQuery>>(
    "/auction-categories/:categoryID/cards", { schema: getAuctionCategoryCardsSchema }, GetAuctionCategoryCardsController,
  );

  fastify.get<RouteWithQuery<GetAuctionCategoriesQuery>>(
    "/auction-categories", { schema: getAuctionCategoriesSchema }, GetAuctionCategoriesController,
  );
  fastify.get<RouteWithParams<AuctionCategoryParams>>(
    "/auction-categories/:categoryID", { schema: getAuctionCategorySchema }, GetAuctionCategoryController,
  );
  fastify.post<RouteWithData<ReqData<CreateAuctionCategoryData>>>(
    "/auction-categories", { schema: createAuctionCategorySchema }, CreateAuctionCategoryController,
  );
  fastify.put<RouteWithParamsAndData<AuctionCategoryParams, ReqData<UpdateAuctionCategoryData>>>(
    "/auction-categories/:categoryID", { schema: updateAuctionCategorySchema }, UpdateAuctionCategoryController,
  );
  fastify.delete<RouteWithParams<AuctionCategoryParams>>(
    "/auction-categories/:categoryID", { schema: deleteAuctionCategorySchema }, DeleteAuctionCategoryController,
  );
};

export default AuctionCategoryRouter;
