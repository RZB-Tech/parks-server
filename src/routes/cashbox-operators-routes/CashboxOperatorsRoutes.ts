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
import { ReqData, RouteWithParams, RouteWithParamsAndData } from "../../types/routes";

const CashboxOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParamsAndData<CashboxOperatorParams, ReqData<CreateCashboxOperatorData>>>(
    "/cashbox/:cashboxID/operators",
    { schema: createCashboxOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_cashier"])] },
    CreateCashboxOperatorsController,
  );

  fastify.delete<RouteWithParams<CashboxOperatorParams>>(
    "/cashbox/:cashboxID/operators/:operatorID",
    { schema: deleteCashboxOperatorsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing", "head_cashier"])] },
    DeleteCashboxOperatorsController,
  );
};

export default CashboxOperatorsRouter;
