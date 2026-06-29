import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { LoginController } from "../../controllers/auth-controllers/AuthController";
import { loginSchema } from "./schema";

const AuthRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/auth/login",
    { schema: loginSchema, preHandler: [] },
    LoginController,
  );
};

export default AuthRouter;
