import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { PaymeMerchantController } from "../../controllers/payment-controllers/payme/PaymeController";
import { PaymeAuthMiddleware } from "../../middlewares/payme-auth-middleware/PaymeAuthMiddleware";
import {
  ClickCompleteController,
  ClickPrepareController,
} from "../../controllers/payment-controllers/click/ClickController";

const PaymentsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.post(
    "/payments/payme",
    { preHandler: PaymeAuthMiddleware },
    PaymeMerchantController,
  );

  fastify.post("/payments/click/prepare", ClickPrepareController);
  fastify.post("/payments/click/complete", ClickCompleteController);
};

export default PaymentsRouter;
