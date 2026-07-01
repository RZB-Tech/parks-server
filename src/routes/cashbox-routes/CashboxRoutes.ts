import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateCashboxesController,
  DeleteCashboxesController,
  GetCashboxController,
  GetCashboxesController,
  GetCashboxStatsController,
  UpdateCashboxesController,
} from "../../controllers/cashbox-controllers/CashboxController";
import {
  createCashboxSchema,
  deleteCashboxesSchema,
  getCashboxesSchema,
  getCashboxSchema,
  getCashboxStatsSchema,
  updateCashboxSchema,
} from "./schema";

const CashboxesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cashbox",
    { schema: getCashboxSchema, preHandler: [] },
    GetCashboxController,
  );

  fastify.get(
    "/cashbox/stats",
    { schema: getCashboxStatsSchema, preHandler: [] },
    GetCashboxStatsController,
  );

  fastify.get(
    "/cashboxes",
    { schema: getCashboxesSchema, preHandler: [] },
    GetCashboxesController,
  );

  fastify.post(
    "/cashbox",
    { schema: createCashboxSchema, preHandler: [] },
    CreateCashboxesController,
  );

  fastify.put(
    "/cashbox/:cashboxID",
    { schema: updateCashboxSchema, preHandler: [] },
    UpdateCashboxesController,
  );

  fastify.delete(
    "/cashbox",
    { schema: deleteCashboxesSchema, preHandler: [] },
    DeleteCashboxesController,
  );
};

export default CashboxesRouter;
