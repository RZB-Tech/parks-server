import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { CreateCardsController, DeleteCardsController, GetCardsController, GetCardStatsController, SendCardRelationOtpController, UpdateCardsController, VerifyCardRelationOtpController } from "../../controllers/cards-controllers/CardController";
import { deleteCardsSchema, getCardsSchema, getCardStatsSchema, sendCardRelationOtpSchema, updateCardSchema, verifyCardRelationOtpSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const CardsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {

  fastify.post<RouteWithData<ReqData<SendCardRelationOtpData>>>(
    "/cards/relation/otp",
    { schema: sendCardRelationOtpSchema, preHandler: [AuthMiddleware]},
    SendCardRelationOtpController,
  );

  fastify.post<RouteWithData<ReqData<VerifyCardRelationOtpData>>>(
    "/cards/relation/verify",
    { schema: verifyCardRelationOtpSchema, preHandler: [AuthMiddleware]},
    VerifyCardRelationOtpController,
  );

  fastify.get<RouteWithQuery<GetCardsQuery>>(
    "/cards/stats",
    { schema: getCardStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCardStatsController,
  );

  fastify.get<RouteWithQuery<GetCardsQuery>>(
    "/cards",
    { schema: getCardsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    GetCardsController,
  );

  fastify.post(
    "/cards/upload",
    { schema: { hide: true } as any, preHandler: [AuthMiddleware] },
    CreateCardsController,
  );

  fastify.put<RouteWithParamsAndData<CardsParams, ReqData<UpdateCardsData>>>(
    "/cards/:cardID",
    { schema: updateCardSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    UpdateCardsController,
  );

  fastify.delete<RouteWithData<ReqData<DeleteCardsData>>>(
    "/cards",
    { schema: deleteCardsSchema, preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_marketing', 'head_cashier'])] },
    DeleteCardsController,
  );
};

export default CardsRouter;
