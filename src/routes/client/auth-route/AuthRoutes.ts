import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import {
  RegisterUserController,
  VerifyRegistrationOtpController,
} from "../../../controllers/client/auth-controller/AuthController";
import { registerUserSchema, verifyRegistrationOtpSchema } from "./schema";

const ClientAuthRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/register",
    { schema: registerUserSchema, preHandler: [TelegramAuthMiddleware] },
    RegisterUserController,
  );

  fastify.post(
    "/register/verify",
    {
      schema: verifyRegistrationOtpSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    VerifyRegistrationOtpController,
  );
};

export default ClientAuthRouter;
