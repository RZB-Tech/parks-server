import { createHmac, timingSafeEqual } from "node:crypto";

export const CARD_BIND_TOKEN_LENGTH = 5;
export const CARD_BIND_TOKEN_PATTERN = /^[A-Za-z0-9]{5}$/;

const GetCardBindTokenSecret = (): string => {
  const secret = process.env.CARD_BIND_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new Error("CARD_BIND_TOKEN_SECRET is not configured!");
  }

  return secret;
};

export const NormalizeCardBindToken = (token: unknown): string =>
  String(token ?? "").trim();

export const IsValidCardBindToken = (token: unknown): boolean =>
  CARD_BIND_TOKEN_PATTERN.test(NormalizeCardBindToken(token));

export const HashCardBindToken = (token: string): string =>
  createHmac("sha256", GetCardBindTokenSecret())
    .update(token)
    .digest("hex");

export const CompareCardBindToken = (
  token: string,
  storedHash: string,
): boolean => {
  const receivedHashBuffer = Buffer.from(HashCardBindToken(token), "hex");
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (receivedHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedHashBuffer, storedHashBuffer);
};
