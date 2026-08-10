import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { GetAttractionPnlController } from "../../controllers/attraction-pnl-controllers/AttractionPnlController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";
import { getAttractionPnlSchema } from "./schema";

const AttractionPnlRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions/reports/pnl",
    {
      schema: getAttractionPnlSchema,
      preHandler: [
        AuthMiddleware,
        RoleMiddleware([
          "superadmin",
          "owner",
          "director",
          "head_accountant",
          "head_marketing",
        ]),
      ],
    },
    GetAttractionPnlController as any,
  );
};

export default AttractionPnlRouter;
