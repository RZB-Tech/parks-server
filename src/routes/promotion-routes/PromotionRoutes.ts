import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { createPromotionSchema } from "./schema";
import { CreatePromotionController } from "../../controllers/promotion-controllers/PromotionController";

const PromotionRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/promotion",
    { schema: createPromotionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing"])]},
    CreatePromotionController,
  );
};

export default PromotionRouter;
