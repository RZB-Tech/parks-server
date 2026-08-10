import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  GetAttractionRoundRefundsController,
  RefundFinishedAttractionRoundController,
} from "../../controllers/attraction-round-refunds-controllers/AttractionRoundRefundController";
import { AuthMiddleware } from "../../middlewares/auth-middleware/AuthMiddleware";
import {
  getAttractionRoundRefundsSchema,
  refundFinishedAttractionRoundSchema,
} from "./schema";
import { RoleMiddleware } from "../../middlewares/role-middleware/RoleMiddleware";

const AttractionRoundRefundRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions/rounds/refunds",
    {
      schema: getAttractionRoundRefundsSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'admin', 'owner', 'director', 'head_accountant', 'head_marketing', 'head_operator', 'operator', 'head_cashier'])],
    },
    GetAttractionRoundRefundsController,
  );

  fastify.post(
    "/attractions/:attractionID/rounds/:roundID/refunds",
    {
      schema: refundFinishedAttractionRoundSchema,
      preHandler: [AuthMiddleware, RoleMiddleware(['superadmin', 'owner', 'head_operator', 'operator', 'head_cashier'])],
    },
    RefundFinishedAttractionRoundController,
  );
};

export default AttractionRoundRefundRouter;
