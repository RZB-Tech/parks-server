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
import { ReqData, RouteWithData } from "../../../types/routes";

const ClientAuthRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithData<ReqData<AuthUserData>>>(
    "/register",
    { schema: registerUserSchema, preHandler: [TelegramAuthMiddleware] },
    RegisterUserController,
  );

  fastify.post<RouteWithData<ReqData<VerifyAuthOtpData>>>(
    "/register/verify",
    {
      schema: verifyRegistrationOtpSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    VerifyRegistrationOtpController,
  );
};

export default ClientAuthRouter;
