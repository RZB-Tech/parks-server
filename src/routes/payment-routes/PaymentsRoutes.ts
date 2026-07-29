import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { PaymeMerchantController } from "../../controllers/payment-controllers/PaymeController";
import { PaymeAuthMiddleware } from "../../middlewares/payme-auth-middleware/PaymeAuthMiddleware";

const PaymentsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  /*
   * Payme Merchant API JSON-RPC callback.
   * Oddiy AuthMiddleware ishlatilmaydi: Payme Basic Auth yuboradi.
   * Body validation controller ichida qilinadi, chunki Payme har qanday
   * RPC xatoda ham HTTP 200 va JSON-RPC error kutadi.
   */
  fastify.post(
    "/payments/payme",
    {
      preHandler: PaymeAuthMiddleware,
    },
    PaymeMerchantController,
  );
};

export default PaymentsRouter;
