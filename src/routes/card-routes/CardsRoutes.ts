import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateCardsController,
  DeleteCardsController,
  GetCardsController,
  GetCardStatsController,
  GetVipCardUsageController,
  UpdateCardsController,
} from "../../controllers/cards-controllers/CardController";
import {
  deleteCardsSchema,
  getCardsSchema,
  getCardStatsSchema,
  getVipCardUsageSchema,
  updateCardSchema,
} from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const CardsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetCardsQuery>>(
    "/cards/stats",
    { schema: getCardStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_accountant', 'head_cashier'])] },
    GetCardStatsController,
  );

  fastify.get<RouteWithQuery<GetCardsQuery>>(
    "/cards",
    { schema: getCardsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_accountant', 'head_cashier'])] },
    GetCardsController,
  );

  fastify.get<RouteWithParams<CardsParams>>(
    "/cards/:cardID/vip-usage",
    {
      schema: getVipCardUsageSchema,
      preHandler: [
        AuthMiddleware,
        RoleMiddleware([
          "superadmin",
          "admin",
          "owner",
          "director",
          "head_marketing",
          "head_accountant",
          "head_cashier",
        ]),
      ],
    },
    GetVipCardUsageController,
  );

  fastify.post(
    "/cards/upload",
    { schema: { hide: true } as any, preHandler: [AuthMiddleware] },
    CreateCardsController,
  );

  fastify.put<RouteWithParamsAndData<CardsParams, ReqData<UpdateCardsData>>>(
    "/cards/:cardID",
    { schema: updateCardSchema, preHandler: [AuthMiddleware] },
    UpdateCardsController,
  );

  fastify.delete<RouteWithData<ReqData<DeleteCardsData>>>(
    "/cards",
    { schema: deleteCardsSchema, preHandler: [AuthMiddleware] },
    DeleteCardsController,
  );
};

export default CardsRouter;
