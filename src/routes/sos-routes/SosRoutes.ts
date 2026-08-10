import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { CreateSosController, GetSOSReportsController } from "../../controllers/sos-controllers/SosController";
import { createSosSchema, getSosReportsSchema } from "./schema";
import { ReqData, RouteWithParamsAndData, RouteWithQuery } from "../../types/routes";

const SosRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithParamsAndData<SosParams, ReqData<CreateSOSData>>>(
    "/sos/:source/:sourceID",
    { schema: createSosSchema, preHandler: [AuthMiddleware] },
    CreateSosController,
  );

   fastify.get<RouteWithQuery<GetSOSReportsQuery>>(
     "/sos",
     { schema: getSosReportsSchema, preHandler: [AuthMiddleware] },
     GetSOSReportsController,
   );
};

export default SosRouter;
