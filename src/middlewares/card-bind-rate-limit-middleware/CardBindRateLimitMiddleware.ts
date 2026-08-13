import { FastifyReply, FastifyRequest } from "fastify";
import { TooManyRequests } from "../../exceptions";

const CARD_BIND_ATTEMPT_LIMIT = 10;
const CARD_BIND_WINDOW_MS = 15 * 60 * 1000;

type CardBindAttempt = {
  count: number;
  expiresAt: number;
};

const attemptsByTelegramUser = new Map<string, CardBindAttempt>();

const CleanupExpiredAttempts = (now: number) => {
  if (attemptsByTelegramUser.size < 10_000) return;

  for (const [key, attempt] of attemptsByTelegramUser.entries()) {
    if (attempt.expiresAt <= now) {
      attemptsByTelegramUser.delete(key);
    }
  }
};

export const CardBindRateLimitMiddleware = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  const telegramUserID = request.telegram_user?.id;

  if (telegramUserID === undefined || telegramUserID === null) return;

  const key = String(telegramUserID);
  const now = Date.now();

  CleanupExpiredAttempts(now);

  const current = attemptsByTelegramUser.get(key);

  if (!current || current.expiresAt <= now) {
    attemptsByTelegramUser.set(key, {
      count: 1,
      expiresAt: now + CARD_BIND_WINDOW_MS,
    });
    return;
  }

  if (current.count >= CARD_BIND_ATTEMPT_LIMIT) {
    throw TooManyRequests("CARD_BIND_TOO_MANY_ATTEMPTS");
  }

  current.count += 1;
};
