import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { createNewsSchema, deleteNewsSchema, getAllNewsSchema, getNewsSchema, updateNewsSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { CreateNewsController, DeleteNewsController, GetAllNewsController, GetNewsController, UpdateNewsController } from "../../controllers/news-controllers/NewsController";

const NewsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/news",
    {schema: getAllNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant',])]},
    GetAllNewsController,
  );

  fastify.get(
    "/news/:newsID",
    {schema: getNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant',])]},
    GetNewsController,
  );

  fastify.post(
    "/news",
    { schema: createNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant',])]},
    CreateNewsController,
  );

  fastify.put(
    "/news/:newsID",
    { schema: updateNewsSchema, preHandler: [ AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant',])]},
    UpdateNewsController,
  );

  fastify.delete(
    "/news",
    { schema: deleteNewsSchema, preHandler: [AuthMiddleware, RoleMiddleware(["superadmin","admin","owner","director","head_marketing",'head_accountant',])]},
    DeleteNewsController,
  );
};

export default NewsRouter;
