import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { closeCurrentAttractionRoundSchema, getCurrentAttractionRoundSchema, getTodayAttractionRoundsSchema, getTodayRoundsSchema } from "./schema";
import { CloseCurrentAttractionRoundController, GetCurrentAttractionRoundController, GetTodayAttractionRoundsController, GetTodayRoundsController } from "../../controllers/attraction-round-controllers/AttractionRoundController";

const AttractionRoundsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions/:attractionID/rounds/current",
    { schema: getCurrentAttractionRoundSchema, preHandler: [AuthMiddleware] },
    GetCurrentAttractionRoundController,
  );

  fastify.get(
    "/attractions/:attractionID/rounds/today",
    { schema: getTodayAttractionRoundsSchema, preHandler: [AuthMiddleware] },
    GetTodayAttractionRoundsController,
  );

  fastify.get(
    "/attractions/rounds/today",
    { schema: getTodayRoundsSchema, preHandler: [AuthMiddleware] },
    GetTodayRoundsController,
  );

  fastify.post(
    "/attractions/:attractionID/rounds/:roundID/close",
    { schema: closeCurrentAttractionRoundSchema, preHandler: [AuthMiddleware] },
    CloseCurrentAttractionRoundController,
  );
};

export default AttractionRoundsRouter;
