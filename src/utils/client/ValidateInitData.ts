import { createHmac, timingSafeEqual } from "node:crypto";

import { Unauthorized } from "../../exceptions";

const GetTelegramBotToken = (): string => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured!");
  }

  return token;
};

const GetInitDataMaxAgeSeconds = (): number => {
  const value = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS);

  if (!Number.isInteger(value) || value <= 0) {
    return 24 * 60 * 60;
  }

  return value;
};

const CompareHashes = (
  calculatedHash: string,
  receivedHash: string,
): boolean => {
  /*
   * Telegram hash SHA-256 hex bo‘lgani uchun
   * aynan 64 ta hex belgidan iborat bo‘lishi kerak.
   */
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return false;
  }

  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  const receivedBuffer = Buffer.from(receivedHash, "hex");

  if (calculatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(calculatedBuffer, receivedBuffer);
};

const ParseTelegramUser = (rawUser: string): TelegramMiniAppUserI => {
  let telegramUser: unknown;

  try {
    telegramUser = JSON.parse(rawUser);
  } catch {
    throw Unauthorized("TELEGRAM_USER_DATA_INVALID");
  }

  if (!telegramUser || typeof telegramUser !== "object") {
    throw Unauthorized("TELEGRAM_USER_DATA_INVALID");
  }

  const user = telegramUser as TelegramMiniAppUserI;

  if (!Number.isSafeInteger(user.id) || user.id <= 0) {
    throw Unauthorized("TELEGRAM_USER_ID_INVALID");
  }

  if (typeof user.first_name !== "string" || !user.first_name.trim()) {
    throw Unauthorized("TELEGRAM_USER_FIRST_NAME_INVALID");
  }

  if (user.last_name !== undefined && typeof user.last_name !== "string") {
    throw Unauthorized("TELEGRAM_USER_LAST_NAME_INVALID");
  }

  if (user.username !== undefined && typeof user.username !== "string") {
    throw Unauthorized("TELEGRAM_USERNAME_INVALID");
  }

  if (user.photo_url !== undefined && typeof user.photo_url !== "string") {
    throw Unauthorized("TELEGRAM_PHOTO_URL_INVALID");
  }

  return user;
};

export const ValidateTelegramInitData = (
  initData: string,
): ValidatedTelegramInitDataI => {
  if (typeof initData !== "string" || !initData.trim()) {
    throw Unauthorized("TELEGRAM_INIT_DATA_REQUIRED");
  }

  /*
   * Raw initData ishlatiladi.
   * Uni decodeURIComponent bilan to‘liq decode
   * qilib yubormaymiz.
   */
  const params = new URLSearchParams(initData.trim());

  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw Unauthorized("TELEGRAM_INIT_DATA_HASH_MISSING");
  }

  /*
   * Bot token orqali HMAC tekshiruvida
   * faqat hash chiqarib tashlanadi.
   *
   * Sizning initData ichidagi signature
   * dataCheckString ichida qoladi.
   */
  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([firstKey], [secondKey]) => {
      if (firstKey < secondKey) {
        return -1;
      }

      if (firstKey > secondKey) {
        return 1;
      }

      return 0;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  /*
   * secretKey:
   *
   * HMAC-SHA256(
   *   key: "WebAppData",
   *   message: botToken
   * )
   */
  const secretKey = createHmac("sha256", "WebAppData")
    .update(GetTelegramBotToken(), "utf8")
    .digest();

  /*
   * calculatedHash:
   *
   * HMAC-SHA256(
   *   key: secretKey,
   *   message: dataCheckString
   * )
   */
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString, "utf8")
    .digest("hex");

  if (!CompareHashes(calculatedHash, receivedHash)) {
    throw Unauthorized("TELEGRAM_INIT_DATA_INVALID");
  }

  const authDateString = params.get("auth_date");

  if (!authDateString) {
    throw Unauthorized("TELEGRAM_AUTH_DATE_MISSING");
  }

  const authDate = Number(authDateString);

  if (!Number.isInteger(authDate) || authDate <= 0) {
    throw Unauthorized("TELEGRAM_AUTH_DATE_INVALID");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  const initDataAgeSeconds = nowSeconds - authDate;

  /*
   * 30 soniya server va Telegram vaqt
   * farqi uchun ruxsat.
   */
  if (initDataAgeSeconds < -30) {
    throw Unauthorized("TELEGRAM_AUTH_DATE_INVALID");
  }

  if (initDataAgeSeconds > GetInitDataMaxAgeSeconds()) {
    throw Unauthorized("TELEGRAM_INIT_DATA_EXPIRED");
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    throw Unauthorized("TELEGRAM_USER_DATA_MISSING");
  }

  const telegramUser = ParseTelegramUser(rawUser);

  return {
    user: telegramUser,
    auth_date: authDate,
    query_id: params.get("query_id"),
    start_param: params.get("start_param"),
    chat_instance: params.get("chat_instance"),
    chat_type: params.get("chat_type"),
    signature: params.get("signature"),
  };
};
