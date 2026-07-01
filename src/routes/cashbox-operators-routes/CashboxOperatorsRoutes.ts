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

const CashboxOperatorsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
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
