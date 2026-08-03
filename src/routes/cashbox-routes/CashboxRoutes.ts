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
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const CashboxesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetCashboxQuery>>(
    "/cashbox",
    { schema: getCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier', 'cashier'])] },
    GetCashboxController,
  );

  fastify.get(
    "/cashbox/stats",
    { schema: getCashboxStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier', 'cashier'])] },
    GetCashboxStatsController,
  );

  fastify.get<RouteWithQuery<GetCashboxesQuery>>(
    "/cashboxes",
    { schema: getCashboxesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier', 'cashier'])] },
    GetCashboxesController,
  );

  fastify.post<RouteWithData<ReqData<CreateCashboxData>>>(
    "/cashbox",
    { schema: createCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    CreateCashboxesController,
  );

  fastify.put<RouteWithParamsAndData<CashboxParams, ReqData<UpdateCashboxData>>>(
    "/cashbox/:cashboxID",
    { schema: updateCashboxSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    UpdateCashboxesController,
  );

  fastify.delete<RouteWithData<ReqData<DeleteCashboxesData>>>(
    "/cashbox",
    { schema: deleteCashboxesSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'head_marketing', 'head_cashier'])] },
    DeleteCashboxesController,
  );
};

export default CashboxesRouter;
