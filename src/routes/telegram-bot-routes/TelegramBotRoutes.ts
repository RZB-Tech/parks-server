import { FastifyPluginAsync } from "fastify";
import { TelegramWebhookController } from "../../controllers/telegram-bot-controllers/TelegramBotController";
import { TelegramWebhookSecretMiddleware } from "../../middlewares/telegram-webhook-secret-middleware/TelegramWebhookSecretMiddleware";
import { RouteWithData } from "../../types/routes";
import { telegramWebhookSchema } from "./schema";

const TelegramBotRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post<RouteWithData<TelegramUpdate>>(
    "/telegram/webhook",
    {
      schema: {
        ...telegramWebhookSchema,
        hide: true,
      } as any,
      preHandler: [TelegramWebhookSecretMiddleware],
    },
    TelegramWebhookController,
  );
};

export default TelegramBotRouter;
