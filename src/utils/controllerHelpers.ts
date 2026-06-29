import { FastifyReply, FastifyRequest } from "fastify";
import { ExceptionsHandler } from "../exceptions";

export function withErrorHandler<Req extends FastifyRequest = FastifyRequest>(
  fn: (request: Req, reply: FastifyReply) => Promise<any>,
) {
  return async (request: Req, reply: FastifyReply) => {
    try {
      return await fn(request, reply);
    } catch (err) {
      return ExceptionsHandler(err as Error, request, reply);
    }
  };
}

export function makeReplyingController<Req extends FastifyRequest = FastifyRequest>(
  resourceKeys: string | Array<string>,
  handler: (request: Req, reply: FastifyReply,) => Promise<any>,
) {
    return withErrorHandler<Req>(async (request, reply) => {
      const data = await handler(request, reply);
      
      return sendResponse(reply, resourceKeys, data);
    });
}

export const sendResponse = <T>(reply: FastifyReply, key: string | Array<string>, value: T | any) =>
  reply.status(200).send({
    statusCode: 200,
    data: Array.isArray(key)
      ? key.reduce((acc, k, index) => ({ ...acc, [k]: value[index] }), {})
      : { [key]: value },
  });