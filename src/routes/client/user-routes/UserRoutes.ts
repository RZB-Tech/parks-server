import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { getMeSchema } from "./schema";
import { GetMeController } from "../../../controllers/client/user-controllers/UserController";

const UserRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/me",
    { schema: getMeSchema, preHandler: [TelegramAuthMiddleware] },
    GetMeController,
  );
};

export default UserRouter;
