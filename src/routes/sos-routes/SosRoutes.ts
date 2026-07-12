import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { CreateSosController, GetSOSReportsController } from "../../controllers/sos-controllers/SosController";
import { createSosSchema, getSosReportsSchema } from "./schema";

const SosRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post(
    "/sos/:source/:sourceID",
    { schema: createSosSchema, preHandler: [AuthMiddleware] },
    CreateSosController,
  );

   fastify.get(
     "/sos",
     { schema: getSosReportsSchema, preHandler: [AuthMiddleware] },
     GetSOSReportsController,
   );
};

export default SosRouter;
