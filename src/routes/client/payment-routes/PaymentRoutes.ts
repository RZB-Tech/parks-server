import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import {
  CreateClientClickOrderController,
  CreateClientPaymeOrderController,
  CreateClientUzumOrderController,
} from "../../../controllers/client/payment-controllers/PaymentController";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { ReqData, RouteWithData } from "../../../types/routes";
import {
  createClientClickOrderSchema,
  createClientPaymeOrderSchema,
  createClientUzumOrderSchema,
} from "./schema";

const ClientPaymentsRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) => {
  fastify.post<RouteWithData<ReqData<CreateClientPaymeOrderData>>>(
    "/payments/payme",
    {
      schema: createClientPaymeOrderSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    CreateClientPaymeOrderController,
  );

  fastify.post<RouteWithData<ReqData<CreateClientClickOrderData>>>(
    "/payments/click",
    {
      schema: createClientClickOrderSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    CreateClientClickOrderController,
  );

  fastify.post<RouteWithData<ReqData<CreateClientUzumOrderData>>>(
    "/payments/uzum",
    {
      schema: createClientUzumOrderSchema,
      preHandler: [TelegramAuthMiddleware],
    },
    CreateClientUzumOrderController,
  );
};

export default ClientPaymentsRouter;
