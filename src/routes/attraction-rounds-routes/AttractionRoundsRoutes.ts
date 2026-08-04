import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  closeCurrentAttractionRoundSchema,
  getAttractionRoundRefundsSchema,
  getCurrentAttractionRoundSchema,
  getTodayAttractionRoundsSchema,
  getTodayRoundsSchema,
  refundFinishedAttractionRoundSchema,
} from "./schema";
import {
  CloseCurrentAttractionRoundController,
  GetAttractionRoundRefundsController,
  GetCurrentAttractionRoundController,
  GetTodayAttractionRoundsController,
  GetTodayRoundsController,
  RefundFinishedAttractionRoundController,
} from "../../controllers/attraction-round-controllers/AttractionRoundController";

const AttractionRoundsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions/rounds/refunds",
    { schema: getAttractionRoundRefundsSchema, preHandler: [AuthMiddleware]},
    GetAttractionRoundRefundsController,
  );

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

  fastify.post(
    "/attractions/:attractionID/rounds/:roundID/refunds",
    { schema: refundFinishedAttractionRoundSchema, preHandler: [AuthMiddleware] },
    RefundFinishedAttractionRoundController,
  );
};

export default AttractionRoundsRouter;
