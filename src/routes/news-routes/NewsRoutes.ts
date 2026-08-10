import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { createNewsSchema, deleteNewsSchema, getAllNewsSchema, getNewsSchema, updateNewsSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { CreateNewsController, DeleteNewsController, GetAllNewsController, GetNewsController, UpdateNewsController } from "../../controllers/news-controllers/NewsController";
import {
  ReqData,
  RouteWithData,
  RouteWithParams,
  RouteWithParamsAndData,
  RouteWithQuery,
} from "../../types/routes";

const NewsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get<RouteWithQuery<GetAllNewsQuery>>(
    "/news",
    {schema: getAllNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant','head_operator','operator','head_cashier','cashier',])]},
    GetAllNewsController,
  );

  fastify.get<RouteWithParams<NewsParams>>(
    "/news/:newsID",
    {schema: getNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant','head_operator','operator','head_cashier','cashier',])]},
    GetNewsController,
  );

  fastify.post<RouteWithData<ReqData<CreateNewsData>>>(
    "/news",
    { schema: createNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","head_marketing"])]},
    CreateNewsController,
  );

  fastify.put<RouteWithParamsAndData<NewsParams, ReqData<UpdateNewsData>>>(
    "/news/:newsID",
    { schema: updateNewsSchema, preHandler: [ AuthMiddleware, RoleMiddleware(["superadmin","head_marketing",])]},
    UpdateNewsController,
  );

  fastify.delete<RouteWithData<ReqData<DeleteNewsData>>>(
    "/news",
    { schema: deleteNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","head_marketing",])]},
    DeleteNewsController,
  );
};

export default NewsRouter;
