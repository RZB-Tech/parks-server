import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { CreateCardsController, DeleteCardsController, GetCardsController, GetCardStatsController, UpdateCardsController } from "../../controllers/cards-controllers/CardController";
import { deleteCardsSchema, getCardsSchema, getCardStatsSchema, updateCardSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const CardsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cards/stats",
    { schema: getCardStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCardStatsController,
  );

  fastify.get(
    "/cards",
    { schema: getCardsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCardsController,
  );

  fastify.post(
    "/cards/upload",
    { schema: { hide: true } as any, preHandler: [AuthMiddleware] },
    CreateCardsController,
  );

  fastify.put(
    "/cards/:cardID",
    { schema: updateCardSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    UpdateCardsController,
  );

  fastify.delete(
    "/cards",
    { schema: deleteCardsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    DeleteCardsController,
  );
};

export default CardsRouter;
