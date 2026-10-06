import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetUsersStatisticsController } from "../../controllers/users-controllers/UsersController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { RouteWithQuery } from "../../types/routes";
import { usersStatisticsSchema } from "./schema";

const usersStatisticsRoles = [
  "superadmin",
  "admin",
  "owner",
  "director",
  "head_marketing",
];

const UsersRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetUsersStatisticsQuery>>(
    "/users/statistics",
    {
      schema: usersStatisticsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(usersStatisticsRoles)],
    },
    GetUsersStatisticsController,
  );
};

export default UsersRouter;

