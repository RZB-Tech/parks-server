import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import {
  getMeSchema,
  updateAgreementSchema,
  updateMeSchema,
} from "./schema";
import {
  GetMeController,
  UpdateAgreementController,
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

  fastify.put(
    "/agreement",
    {
      schema: updateAgreementSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    UpdateAgreementController,
  );
};

export default UserRouter;
