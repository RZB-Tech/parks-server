import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetMeController, LoginController } from "../../controllers/auth-controllers/AuthController";
import { getMeSchema, loginSchema } from "./schema";

const AuthRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/auth/login",
    { schema: loginSchema, preHandler: [] },
    LoginController,
  );
  fastify.post(
    "/auth/getme",
    { schema: getMeSchema, preHandler: [] },
    GetMeController,
  );
};

export default AuthRouter;
