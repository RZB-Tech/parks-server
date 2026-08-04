import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { createPromotionSchema, deletePromotionsSchema, getAllPromotionsSchema, getPromotionSchema, updatePromotionSchema } from "./schema";
import { CreatePromotionController, DeletePromotionController, GetAllPromotionsController, GetPromotionController, UpdatePromotionController } from "../../controllers/promotion-controllers/PromotionController";

const PromotionRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/promotions",
    { schema: getAllPromotionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant"])]},
    GetAllPromotionsController,
  );
  fastify.get(
    "/promotions/:promotionID",
    { schema: getPromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant"])]},
    GetPromotionController,
  );
  fastify.post(
    "/promotion",
    { schema: createPromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant"])]},
    CreatePromotionController,
  );
  fastify.put(
    "/promotion/:promotionID",
    { schema: updatePromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant"])]},
    UpdatePromotionController,
  );
  fastify.delete(
    "/promotions",
    { schema: deletePromotionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing", "head_accountant"])]},
    DeletePromotionController,
  );
};

export default PromotionRouter;
