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
import {
  UzumCheckController,
  UzumConfirmController,
  UzumCreateController,
  UzumInvalidMethodController,
  UzumMerchantRouteErrorHandler,
  UzumReverseController,
  UzumStatusController,
} from "../../controllers/payment-controllers/uzum/UzumController";
import {
  uzumCheckSchema,
  uzumConfirmSchema,
  uzumCreateSchema,
  uzumReverseSchema,
  uzumStatusSchema,
} from "./uzumSchema";

const PaymentsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.post(
    "/payments/payme",
    {
      schema: { hide: true } as any,
      preHandler: PaymeAuthMiddleware,
    },
    PaymeMerchantController,
  );

  fastify.post(
    "/payments/click/prepare",
    { schema: { hide: true } as any },
    ClickPrepareController,
  );
  fastify.post(
    "/payments/click/complete",
    { schema: { hide: true } as any },
    ClickCompleteController,
  );

  fastify.post<{ Body: UzumCheckRequest }>(
    "/payments/uzum/check",
    {
      schema: uzumCheckSchema,
      errorHandler: UzumMerchantRouteErrorHandler("check"),
    },
    UzumCheckController,
  );
  fastify.post<{ Body: UzumCreateRequest }>(
    "/payments/uzum/create",
    {
      schema: uzumCreateSchema,
      errorHandler: UzumMerchantRouteErrorHandler("create"),
    },
    UzumCreateController,
  );
  fastify.post<{ Body: UzumConfirmRequest }>(
    "/payments/uzum/confirm",
    {
      schema: uzumConfirmSchema,
      errorHandler: UzumMerchantRouteErrorHandler("confirm"),
    },
    UzumConfirmController,
  );
  fastify.post<{ Body: UzumReverseRequest }>(
    "/payments/uzum/reverse",
    {
      schema: uzumReverseSchema,
      errorHandler: UzumMerchantRouteErrorHandler("reverse"),
    },
    UzumReverseController,
  );
  fastify.post<{ Body: UzumStatusRequest }>(
    "/payments/uzum/status",
    {
      schema: uzumStatusSchema,
      errorHandler: UzumMerchantRouteErrorHandler("status"),
    },
    UzumStatusController,
  );

  for (const operation of [
    "check",
    "create",
    "confirm",
    "reverse",
    "status",
  ] as const) {
    fastify.route({
      method: ["GET", "PUT", "PATCH", "DELETE"],
      url: `/payments/uzum/${operation}`,
      schema: { hide: true } as any,
      handler: UzumInvalidMethodController(operation),
    });
  }
};

export default PaymentsRouter;
