import { FastifyReply, FastifyRequest } from "fastify";
import { ExceptionsHandler } from "../../../exceptions";
import { ProcessUzumCallbackService } from "../../../services/payment-services/uzum/UzumServices";
import { RouteWithData } from "../../../types/routes";

export const UzumCallbackController = async (
  request: FastifyRequest<RouteWithData<UzumCallbackBody>>,
  reply: FastifyReply,
) => {
  try {
    const body = request.body;
    
    const response = await ProcessUzumCallbackService(body);
    return reply.code(200).send(response);
  } catch (error) {
    return ExceptionsHandler(error as Error, request, reply);
  }
};
