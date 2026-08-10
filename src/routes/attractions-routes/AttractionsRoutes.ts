import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateAttractionsController,
  DeleteAttractionsController,
  GetAttractionController,
  GetAttractionsController,
  GetAttractionStatsController,
  UpdateAttractionsController,
} from "../../controllers/attraction-controllers/AttractionController";
import {
  createAttractionSchema,
  deleteAttractionsSchema,
  getAttractionSchema,
  getAttractionsSchema,
  getAttractionsStatsSchema,
  updateAttractionSchema,
} from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import {
  ReqData,
  RouteWithData,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const AttractionsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetAttractionQuery>>(
    "/attraction",
    { schema: getAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", 'head_accountant', "head_operator", "hr", 'operator'])] },
    GetAttractionController,
  );

  fastify.get(
    "/attraction/stats",
    { schema: getAttractionsStatsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", 'head_accountant', "head_operator", "hr", 'operator'])] },
    GetAttractionStatsController,
  );

  fastify.get<RouteWithQuery<GetAttractionsQuery>>(
    "/attractions",
    { schema: getAttractionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "admin", "owner", "director", "head_marketing", 'head_accountant',  "head_operator", "hr", 'operator'])] },
    GetAttractionsController,
  );

  fastify.post<RouteWithData<ReqData<CreateAttractionData>>>(
    "/attractions",
    { schema: createAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing"])] },
    CreateAttractionsController,
  );

  fastify.put<RouteWithParamsAndData<AttractionParams, ReqData<UpdateAttractionData>>>(
    "/attractions/:attractionID",
    { schema: updateAttractionSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing"])] },
    UpdateAttractionsController,
  );

  fastify.delete<RouteWithData<ReqData<DeleteAttractionsData>>>(
    "/attractions",
    { schema: deleteAttractionsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin", "head_marketing"])] },
    DeleteAttractionsController,
  );
};

export default AttractionsRouter;
