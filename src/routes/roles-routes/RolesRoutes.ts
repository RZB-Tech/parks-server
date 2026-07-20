import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetRolesController } from "../../controllers/roles-controllers/RolesController";
import { getRolesSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

const RolesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/roles",
    { schema: getRolesSchema, preHandler: [] },
    GetRolesController,
  );
};

export default RolesRouter;
