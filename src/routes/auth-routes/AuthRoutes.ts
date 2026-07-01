import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { GetMeController, LoginController } from "../../controllers/auth-controllers/AuthController";
import { getMeSchema, loginSchema } from "./schema";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";

const AuthRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/auth/login",
    { schema: loginSchema, preHandler: [] },
    LoginController,
  );

  fastify.get(
    "/auth/getme",
    { schema: getMeSchema, preHandler: [AuthMiddleware] },
    GetMeController,
  );
};

export default AuthRouter;
