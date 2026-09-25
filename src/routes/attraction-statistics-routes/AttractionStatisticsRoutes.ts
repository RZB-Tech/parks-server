import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { RouteWithQuery } from "../../types/routes";
import { GetAttractionStatisticsController } from "../../controllers/attraction-statistics-controllers/AttractionStatisticsController";
import { attractionStatisticsSchema } from "./schema";

const statisticsRoles = [
  "superadmin",
  "admin",
  "owner",
  "director",
  "head_accountant",
  "head_marketing",
  "head_cashier",
];

const AttractionStatisticsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetAttractionStatisticsQuery>>(
    "/statistics/attractions",
    {
      schema: attractionStatisticsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(statisticsRoles)],
    },
    GetAttractionStatisticsController,
  );
};

export default AttractionStatisticsRouter;
