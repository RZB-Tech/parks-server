import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  closeCurrentAttractionRoundSchema,
  getCurrentAttractionRoundSchema,
  getTodayAttractionRoundsSchema,
  getTodayRoundsSchema,
  attractionRoundEventsSchema,
} from "./schema";
import {
  CloseCurrentAttractionRoundController,
  GetCurrentAttractionRoundController,
  GetTodayAttractionRoundsController,
  GetTodayRoundsController,
} from "../../controllers/attraction-round-controllers/AttractionRoundController";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { RouteWithParams } from "../../types/routes";
import { AttractionRoundEventsController, ROUND_EVENTS_ROLES } from "../../controllers/attraction-round-controllers/AttractionRoundEventsController";

const AttractionRoundsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<{ Params: { attractionID: number } }>(
    "/attractions/:attractionID/rounds/events",
    { schema: attractionRoundEventsSchema, preHandler: [AuthMiddleware, RoleMiddleware(ROUND_EVENTS_ROLES)] },
    AttractionRoundEventsController,
  );
  fastify.get<RouteWithParams<AttractionRoundParams>>(
    "/attractions/:attractionID/rounds/current",
    { schema: getCurrentAttractionRoundSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])] },
    GetCurrentAttractionRoundController,
  );

  fastify.get<RouteWithParams<AttractionRoundParams>>(
    "/attractions/:attractionID/rounds/today",
    { schema: getTodayAttractionRoundsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])] },
    GetTodayAttractionRoundsController,
  );

  fastify.get(
    "/attractions/rounds/today",
    { schema: getTodayRoundsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])] },
    GetTodayRoundsController,
  );

  fastify.post<RouteWithParams<AttractionRoundParams>>(
    "/attractions/:attractionID/rounds/:roundID/close",
    { schema: closeCurrentAttractionRoundSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'head_operator', 'operator', 'head_cashier'])] },
    CloseCurrentAttractionRoundController,
  );

};

export default AttractionRoundsRouter;
