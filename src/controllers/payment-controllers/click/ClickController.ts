import { FastifyReply, FastifyRequest } from "fastify";
import {
  CompleteClickTransactionService,
  PrepareClickTransactionService,
} from "../../../services/payment-services/click/ClickServices";
import { ClickSystemErrorResponse } from "../../../exceptions/click/ClickExceptions";
import { RouteWithData } from "../../../types/routes";

const sendClickResponse = (
  reply: FastifyReply,
  response: ClickCallbackResponse,
) => reply.code(200).type("application/json; charset=utf-8").send(response);

export const ClickPrepareController = async (
  request: FastifyRequest<RouteWithData<ClickCallbackBody>>,
  reply: FastifyReply,
) => {
  const body = request.body;

  try {
    return sendClickResponse(reply, await PrepareClickTransactionService(body));
  } catch (error) {
    request.log.error({ error }, "Click Prepare request failed");
    return sendClickResponse(reply, ClickSystemErrorResponse(body));
  }
};

export const ClickCompleteController = async (
  request: FastifyRequest<RouteWithData<ClickCallbackBody>>,
  reply: FastifyReply,
) => {
  const body = request.body;

  try {
    return sendClickResponse(
      reply,
      await CompleteClickTransactionService(body),
    );
  } catch (error) {
    request.log.error({ error }, "Click Complete request failed");
    return sendClickResponse(reply, ClickSystemErrorResponse(body));
  }
};
