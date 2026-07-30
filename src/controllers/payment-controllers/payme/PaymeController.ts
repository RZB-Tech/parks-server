import { FastifyReply, FastifyRequest } from "fastify";
import {
  PaymeErrorResponse,
  PaymeErrors,
} from "../../../exceptions/payme/PaymeExceptions";
import {
  DispatchPaymeMethodService,
  IsPaymeRpcRequest,
} from "../../../services/payment-services/payme/PaymeServices";

const getRequestID = (body: unknown): PaymeRpcID => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const id = (body as { id?: unknown }).id;

  return Number.isInteger(id) ? Number(id) : null;
};

const sendPaymeResponse = (
  reply: FastifyReply,
  response: PaymeRpcResponse,
) => reply.code(200).type("application/json; charset=utf-8").send(response);

export const PaymeMerchantController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const requestID = getRequestID(request.body);

  if (!IsPaymeRpcRequest(request.body)) {
    return sendPaymeResponse(
      reply,
      PaymeErrorResponse(requestID, PaymeErrors.invalidRequest()),
    );
  }

  try {
    const response = await DispatchPaymeMethodService(request.body);

    return sendPaymeResponse(reply, response);
  } catch (error) {
    request.log.error(
      {
        error,
        payme_method: request.body.method,
        payme_request_id: request.body.id,
      },
      "Payme Merchant API request failed",
    );

    return sendPaymeResponse(
      reply,
      PaymeErrorResponse(request.body.id, PaymeErrors.system()),
    );
  }
};
