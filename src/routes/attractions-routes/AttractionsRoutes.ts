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

const AttractionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attraction",
    { schema: getAttractionSchema, preHandler: [] },
    GetAttractionController,
  );

  fastify.get(
    "/attraction/stats",
    { schema: getAttractionsStatsSchema, preHandler: [] },
    GetAttractionStatsController,
  );

  fastify.get(
    "/attractions",
    { schema: getAttractionsSchema, preHandler: [] },
    GetAttractionsController,
  );

  fastify.post(
    "/attractions",
    { schema: createAttractionSchema, preHandler: [] },
    CreateAttractionsController,
  );

  fastify.put(
    "/attractions/:attractionID",
    { schema: updateAttractionSchema, preHandler: [] },
    UpdateAttractionsController,
  );

  fastify.delete(
    "/attractions",
    { schema: deleteAttractionsSchema, preHandler: [] },
    DeleteAttractionsController,
  );
};

export default AttractionsRouter;
