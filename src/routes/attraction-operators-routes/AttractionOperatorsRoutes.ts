import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateAttractionOperatorsController,
  DeleteAttractionOperatorsController,
  GetOperatorAttractionController,
  GetOperatorAttractionsController,
} from "../../controllers/attraction-operator-controllers/AttractionOperatorController";
import {
  createAttractionOperatorsSchema,
  deleteAttractionOperatorsSchema,
  getOperatorAttractionSchema,
  getOperatorAttractionsSchema,
} from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

const AttractionOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/operator/attractions",
    { schema: getOperatorAttractionsSchema, preHandler: [AuthMiddleware] },
    GetOperatorAttractionsController,
  );

  fastify.get(
    "/operator/attractions/:attractionID",
    { schema: getOperatorAttractionSchema, preHandler: [AuthMiddleware] },
    GetOperatorAttractionController,
  );

  fastify.post(
    "/attractions/:attractionID/operators",
    { schema: createAttractionOperatorsSchema, preHandler: [] },
    CreateAttractionOperatorsController,
  );

  fastify.delete(
    "/attractions/:attractionID/operators/:operatorID",
    { schema: deleteAttractionOperatorsSchema, preHandler: [] },
    DeleteAttractionOperatorsController,
  );
};

export default AttractionOperatorsRouter;
