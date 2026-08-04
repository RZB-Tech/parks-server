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

const AttractionRoundRefundRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/attractions/rounds/refunds",
    {
      schema: getAttractionRoundRefundsSchema,
      preHandler: [AuthMiddleware],
    },
    GetAttractionRoundRefundsController,
  );

  fastify.post(
    "/attractions/:attractionID/rounds/:roundID/refunds",
    {
      schema: refundFinishedAttractionRoundSchema,
      preHandler: [AuthMiddleware],
    },
    RefundFinishedAttractionRoundController,
  );
};

export default AttractionRoundRefundRouter;
