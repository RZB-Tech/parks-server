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
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AttractionOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/attractions/:attractionID/operators",
    { schema: createAttractionOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_operator"])] },
    CreateAttractionOperatorsController,
  );

  fastify.delete(
    "/attractions/:attractionID/operators/:operatorID",
    { schema: deleteAttractionOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_operator"])] },
    DeleteAttractionOperatorsController,
  );
};

export default AttractionOperatorsRouter;
