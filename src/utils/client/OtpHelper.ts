import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const GetOtpHashSecret = (): string => {
  const secret = process.env.CLIENT_OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("CLIENT_OTP_HASH_SECRET is not configured!");
  }

  return secret;
};

export const GenerateOtpCode = (): string => {
  // return randomInt(100000, 1000000).toString();
  return '777777'
};

export const HashOtpCode = (
  phoneNumber: string,
  purpose: string,
  code: string,
): string => {
  return createHmac("sha256", GetOtpHashSecret())
    .update(`${phoneNumber}:${purpose}:${code}`)
    .digest("hex");
};

export const CompareOtpCode = (
  phoneNumber: string,
  purpose: string,
  code: string,
  storedHash: string,
): boolean => {
  const receivedHash = HashOtpCode(phoneNumber, purpose, code);

  const receivedHashBuffer = Buffer.from(receivedHash, "hex");

  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (receivedHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedHashBuffer, storedHashBuffer);
};

export const ValidateOtpCode = (code: string): string => {
  const normalizedCode = String(code || "").trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("OTP code must contain exactly 6 digits!");
  }

  return normalizedCode;
};
