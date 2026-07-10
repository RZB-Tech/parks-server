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
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const CashboxesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cashbox",
    { schema: getCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCashboxController,
  );

  fastify.get(
    "/cashbox/stats",
    { schema: getCashboxStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCashboxStatsController,
  );

  fastify.get(
    "/cashboxes",
    { schema: getCashboxesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCashboxesController,
  );

  fastify.post(
    "/cashbox",
    { schema: createCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    CreateCashboxesController,
  );

  fastify.put(
    "/cashbox/:cashboxID",
    { schema: updateCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    UpdateCashboxesController,
  );

  fastify.delete(
    "/cashbox",
    { schema: deleteCashboxesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    DeleteCashboxesController,
  );
};

export default CashboxesRouter;
