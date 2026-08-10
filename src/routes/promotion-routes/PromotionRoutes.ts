import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { createPromotionSchema, deletePromotionsSchema, getAllPromotionsSchema, getPromotionSchema, updatePromotionSchema } from "./schema";
import { CreatePromotionController, DeletePromotionController, GetAllPromotionsController, GetPromotionController, UpdatePromotionController } from "../../controllers/promotion-controllers/PromotionController";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const PromotionRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetPromotionsQuery>>(
    "/promotions",
    { schema: getAllPromotionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant",'head_operator','operator','head_cashier','cashier',])]},
    GetAllPromotionsController,
  );
  fastify.get<RouteWithParams<PromotionParams>>(
    "/promotions/:promotionID",
    { schema: getPromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant",'head_operator','operator','head_cashier','cashier',])]},
    GetPromotionController,
  );
  fastify.post<RouteWithData<ReqData<CreatePromotionData>>>(
    "/promotion",
    { schema: createPromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","head_marketing"])]},
    CreatePromotionController,
  );
  fastify.put<RouteWithParamsAndData<PromotionParams, ReqData<UpdatePromotionData>>>(
    "/promotion/:promotionID",
    { schema: updatePromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","head_marketing"])]},
    UpdatePromotionController,
  );
  fastify.delete<RouteWithData<ReqData<DeletePromotionsData>>>(
    "/promotions",
    { schema: deletePromotionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","head_marketing"])]},
    DeletePromotionController,
  );
};

export default PromotionRouter;
