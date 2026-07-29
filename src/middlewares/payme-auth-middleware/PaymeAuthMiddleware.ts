import { timingSafeEqual } from "crypto";
import {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import {
  PaymeErrorResponse,
  PaymeErrors,
} from "../../exceptions/payme/PaymeExceptions";

const safeEqual = (first: string, second: string) => {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
};

const getPaymeKey = () =>
  process.env.PAYME_MODE === "test"
    ? process.env.PAYME_TEST_KEY
    : process.env.PAYME_KEY;

const getRequestID = (body: unknown): PaymeRpcID => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const id = (body as { id?: unknown }).id;

  return Number.isInteger(id) ? Number(id) : null;
};

const verifyPaymeBasicAuth = (
  authorization: string | string[] | undefined,
) => {
  if (typeof authorization !== "string") {
    return false;
  }

  const [scheme, encodedCredentials] = authorization.trim().split(/\s+/, 2);

  if (
    scheme?.toLowerCase() !== "basic" ||
    typeof encodedCredentials !== "string"
  ) {
    return false;
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf8",
  );
  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex <= 0) {
    return false;
  }

  const login = decodedCredentials.slice(0, separatorIndex);
  const password = decodedCredentials.slice(separatorIndex + 1);
  const expectedLogin = process.env.PAYME_LOGIN;
  const expectedKey = getPaymeKey();

  if (!expectedLogin || !expectedKey) {
    return false;
  }

  return safeEqual(login, expectedLogin) && safeEqual(password, expectedKey);
};

export const PaymeAuthMiddleware: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (verifyPaymeBasicAuth(request.headers.authorization)) {
    return;
  }

  return reply
    .code(200)
    .type("application/json; charset=utf-8")
    .send(
      PaymeErrorResponse(
        getRequestID(request.body),
        PaymeErrors.unauthorized(),
      ),
    );
};
