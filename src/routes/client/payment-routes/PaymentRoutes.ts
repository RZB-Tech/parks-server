import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { CreateClientPaymeOrderController } from "../../../controllers/client/payment-controllers/PaymentController";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { ReqData, RouteWithData } from "../../../types/routes";
import { createClientPaymeOrderSchema } from "./schema";

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
};

export default ClientPaymentsRouter;
