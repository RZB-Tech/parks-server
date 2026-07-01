import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateAttractionOperatorsController,
  DeleteAttractionOperatorsController,
} from "../../controllers/attraction-operator-controllers/AttractionOperatorController";
import {
  createAttractionOperatorsSchema,
  deleteAttractionOperatorsSchema,
} from "./schema";

const AttractionOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
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
