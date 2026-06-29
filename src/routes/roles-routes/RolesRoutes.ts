import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetRolesController } from "../../controllers/roles-controllers/RolesController";
import { getRolesSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const RolesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/roles",
    { schema: getRolesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin'])] },
    GetRolesController,
  );
};

export default RolesRouter;
