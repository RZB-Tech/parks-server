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
import { ReqData, RouteWithParams, RouteWithParamsAndData } from "../../types/routes";

const AttractionOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParamsAndData<AttractionOperatorParams, ReqData<CreateAttractionOperatorData>>>(
    "/attractions/:attractionID/operators",
    { schema: createAttractionOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'admin', 'head_cashier', 'head_operator'])] },
    CreateAttractionOperatorsController,
  );

  fastify.delete<RouteWithParams<AttractionOperatorParams>>(
    "/attractions/:attractionID/operators/:operatorID",
    { schema: deleteAttractionOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", 'admin', 'head_cashier', 'head_operator'])] },
    DeleteAttractionOperatorsController,
  );
};

export default AttractionOperatorsRouter;
