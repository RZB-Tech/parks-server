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
import { UzumCallbackController } from "../../controllers/payment-controllers/uzum/UzumController";
import { RouteWithData } from "../../types/routes";
import { uzumCallbackSchema } from "./uzumSchema";

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

  fastify.post<RouteWithData<UzumCallbackBody>>(
    "/payments/uzum/callback",
    { schema: uzumCallbackSchema },
    UzumCallbackController,
  );
};

export default PaymentsRouter;
