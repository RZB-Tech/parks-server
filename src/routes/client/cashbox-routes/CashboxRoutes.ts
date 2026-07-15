import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
} from "fastify";
import { TelegramAuthMiddleware } from "../../../middlewares/telegram-auth-middlewar/TelegramAuthMiddleware";
import { GetClientCashboxesController } from "../../../controllers/client/cashbox-controllers/CashboxController";
import { getClientCashboxesSchema } from "./schema";

const ClientCashboxesRouter: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) => {
  fastify.get(
    "/cashboxes",
    { schema: getClientCashboxesSchema, preHandler: [TelegramAuthMiddleware] },
    GetClientCashboxesController,
  );
};

export default ClientCashboxesRouter;
