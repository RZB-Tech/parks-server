import { timingSafeEqual } from "crypto";
import {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";

const SafeEqual = (first: string, second: string): boolean => {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
};

export const TelegramWebhookSecretMiddleware: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers["x-telegram-bot-api-secret-token"];

  if (
    expectedSecret &&
    typeof receivedSecret === "string" &&
    SafeEqual(receivedSecret, expectedSecret)
  ) {
    return;
  }

  return reply.code(401).send({ statusCode: 401, message: "UNAUTHORIZED" });
};
