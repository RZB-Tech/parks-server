import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const CARD_BIND_TOKEN_LENGTH = 5;
export const CARD_BIND_TOKEN_PATTERN = /^[A-Za-z0-9]{5}$/;

const CARD_BIND_TOKEN_CIPHER_PREFIX = "enc1:";
const CARD_BIND_TOKEN_CIPHER = "aes-256-gcm";
const CARD_BIND_TOKEN_IV_LENGTH = 12;
const CARD_BIND_TOKEN_AUTH_TAG_LENGTH = 16;
const CARD_BIND_TOKEN_AAD = Buffer.from("parks-card-bind-token:v1");

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

const GetCardBindTokenEncryptionKey = (): Buffer =>
  createHash("sha256").update(GetCardBindTokenSecret()).digest();

const GetCardBindTokenIV = (token: string, key: Buffer): Buffer =>
  createHmac("sha256", key)
    .update(`card-bind-token:${token}`)
    .digest()
    .subarray(0, CARD_BIND_TOKEN_IV_LENGTH);

export const EncryptCardBindToken = (token: string): string => {
  const normalizedToken = NormalizeCardBindToken(token);

  if (!IsValidCardBindToken(normalizedToken)) {
    throw new Error("CARD_BIND_TOKEN_INVALID");
  }

  const key = GetCardBindTokenEncryptionKey();
  const iv = GetCardBindTokenIV(normalizedToken, key);
  const cipher = createCipheriv(CARD_BIND_TOKEN_CIPHER, key, iv);
  cipher.setAAD(CARD_BIND_TOKEN_AAD);

  const encrypted = Buffer.concat([
    cipher.update(normalizedToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64url");

  return `${CARD_BIND_TOKEN_CIPHER_PREFIX}${payload}`;
};

export const DecryptCardBindToken = (
  encryptedToken: string | null | undefined,
): string | null => {
  if (!encryptedToken?.startsWith(CARD_BIND_TOKEN_CIPHER_PREFIX)) {
    return null;
  }

  try {
    const payload = Buffer.from(
      encryptedToken.slice(CARD_BIND_TOKEN_CIPHER_PREFIX.length),
      "base64url",
    );
    const minimumPayloadLength =
      CARD_BIND_TOKEN_IV_LENGTH + CARD_BIND_TOKEN_AUTH_TAG_LENGTH + 1;

    if (payload.length < minimumPayloadLength) {
      return null;
    }

    const key = GetCardBindTokenEncryptionKey();
    const iv = payload.subarray(0, CARD_BIND_TOKEN_IV_LENGTH);
    const authTag = payload.subarray(
      CARD_BIND_TOKEN_IV_LENGTH,
      CARD_BIND_TOKEN_IV_LENGTH + CARD_BIND_TOKEN_AUTH_TAG_LENGTH,
    );
    const encrypted = payload.subarray(
      CARD_BIND_TOKEN_IV_LENGTH + CARD_BIND_TOKEN_AUTH_TAG_LENGTH,
    );
    const decipher = createDecipheriv(CARD_BIND_TOKEN_CIPHER, key, iv);
    decipher.setAAD(CARD_BIND_TOKEN_AAD);
    decipher.setAuthTag(authTag);

    const token = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    if (!IsValidCardBindToken(token)) {
      return null;
    }

    return token;
  } catch {
    return null;
  }
};

const SafeTokenEqual = (receivedToken: string, storedToken: string): boolean => {
  const receivedBuffer = Buffer.from(receivedToken);
  const storedBuffer = Buffer.from(storedToken);

  return (
    receivedBuffer.length === storedBuffer.length &&
    timingSafeEqual(receivedBuffer, storedBuffer)
  );
};

export const CompareCardBindToken = (
  token: string,
  storedToken: string,
): boolean => {
  const normalizedToken = NormalizeCardBindToken(token);
  const decryptedToken = DecryptCardBindToken(storedToken);

  if (decryptedToken !== null) {
    return SafeTokenEqual(normalizedToken, decryptedToken);
  }

  if (!/^[a-f0-9]{64}$/i.test(storedToken)) {
    return false;
  }

  const receivedHashBuffer = Buffer.from(
    HashCardBindToken(normalizedToken),
    "hex",
  );
  const storedHashBuffer = Buffer.from(storedToken, "hex");

  if (receivedHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedHashBuffer, storedHashBuffer);
};
