import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  createCashboxOperatorsSchema,
  deleteCashboxOperatorsSchema,
  getCashboxOperatorByEmployeeSchema,
} from "./schema";
import {
  CreateCashboxOperatorsController,
  DeleteCashboxOperatorsController,
  GetCashboxOperatorByEmployeeController,
} from "../../controllers/cashbox-operator-controllers/CashboxOperatorController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

const CashboxOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cashbox/operators/me",
    { schema: getCashboxOperatorByEmployeeSchema, preHandler: [AuthMiddleware] },
    GetCashboxOperatorByEmployeeController,
  );

  fastify.post(
    "/cashbox/:cashboxID/operators",
    { schema: createCashboxOperatorsSchema, preHandler: [] },
    CreateCashboxOperatorsController,
  );

  fastify.delete(
    "/cashbox/:cashboxID/operators/:operatorID",
    { schema: deleteCashboxOperatorsSchema, preHandler: [] },
    DeleteCashboxOperatorsController,
  );
};

export default CashboxOperatorsRouter;
