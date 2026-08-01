import { FastifyReply, FastifyRequest } from "fastify";
import { ProcessTelegramUpdate } from "../../services/telegram-bot-services/TelegramBotServices";
import { RouteWithData } from "../../types/routes";

export const TelegramWebhookController = async (
  request: FastifyRequest<RouteWithData<TelegramUpdate>>,
  reply: FastifyReply,
) => {
  try {
    await ProcessTelegramUpdate(request.body);
  } catch (error) {
    request.log.error({ error }, "Telegram update processing failed");
  }

  return reply.code(200).send({ ok: true });
};
