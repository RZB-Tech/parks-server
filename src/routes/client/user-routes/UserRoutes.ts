import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { getMeSchema, updateMeSchema } from "./schema";
import {
  GetMeController,
  UpdateMeController,
} from "../../../controllers/client/user-controllers/UserController";

const UserRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/me",
    { schema: getMeSchema, preHandler: [TelegramAuthMiddleware] },
    GetMeController,
  );

  fastify.put(
    "/me",
    { schema: updateMeSchema, preHandler: [TelegramAuthMiddleware] },
    UpdateMeController,
  );
};

export default UserRouter;
