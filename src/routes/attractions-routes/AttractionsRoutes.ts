import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateAttractionsController,
  DeleteAttractionsController,
  GetAttractionController,
  GetAttractionsController,
  GetAttractionStatsController,
  UpdateAttractionsController,
} from "../../controllers/attraction-controllers/AttractionController";
import {
  createAttractionSchema,
  deleteAttractionsSchema,
  getAttractionSchema,
  getAttractionsSchema,
  getAttractionsStatsSchema,
  updateAttractionSchema,
} from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AttractionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attraction",
    { schema: getAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", "head_operator", "operator"])] },
    GetAttractionController,
  );

  fastify.get(
    "/attraction/stats",
    { schema: getAttractionsStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", "head_operator"])] },
    GetAttractionStatsController,
  );

  fastify.get(
    "/attractions",
    { schema: getAttractionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", "head_operator", "operator"])] },
    GetAttractionsController,
  );

  fastify.post(
    "/attractions",
    { schema: createAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_operator"])] },
    CreateAttractionsController,
  );

  fastify.put(
    "/attractions/:attractionID",
    { schema: updateAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_operator"])] },
    UpdateAttractionsController,
  );

  fastify.delete(
    "/attractions",
    { schema: deleteAttractionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_operator"])] },
    DeleteAttractionsController,
  );
};

export default AttractionsRouter;
