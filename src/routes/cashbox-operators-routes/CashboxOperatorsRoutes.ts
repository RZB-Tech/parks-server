import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  createCashboxOperatorsSchema,
  deleteCashboxOperatorsSchema,
} from "./schema";
import {
  CreateCashboxOperatorsController,
  DeleteCashboxOperatorsController,
} from "../../controllers/cashbox-operator-controllers/CashboxOperatorController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const CashboxOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/cashbox/:cashboxID/operators",
    { schema: createCashboxOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_cashier"])] },
    CreateCashboxOperatorsController,
  );

  fastify.delete(
    "/cashbox/:cashboxID/operators/:operatorID",
    { schema: deleteCashboxOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_cashier"])] },
    DeleteCashboxOperatorsController,
  );
};

export default CashboxOperatorsRouter;
