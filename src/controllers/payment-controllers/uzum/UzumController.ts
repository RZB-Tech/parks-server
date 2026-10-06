import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  AssertUzumMerchantAuthorization,
  CheckUzumMerchantPaymentService,
  ConfirmUzumMerchantTransactionService,
  CreateUzumMerchantTransactionService,
  GetUzumMerchantTransactionStatusService,
  ReverseUzumMerchantTransactionService,
  UZUM_MERCHANT_ERROR_CODES,
  UzumMerchantError,
  UzumMerchantErrorCode,
} from "../../../services/payment-services/uzum/UzumServices";

type MerchantRequestBody = Partial<
  UzumCheckRequest & UzumCreateRequest & UzumConfirmRequest
>;

const validationErrorCode = (error: FastifyError): UzumMerchantErrorCode => {
  const validation = (error as FastifyError & {
    validation?: Array<{ keyword?: string }>;
    code?: string;
  }).validation;

  if (validation?.some((item) => item.keyword === "required")) {
    return UZUM_MERCHANT_ERROR_CODES.REQUIRED_PARAMETER_MISSING;
  }

  return UZUM_MERCHANT_ERROR_CODES.INVALID_JSON;
};

const errorResponse = (
  operation: UzumMerchantOperation,
  body: MerchantRequestBody | undefined,
  errorCode: UzumMerchantErrorCode,
) => {
  const now = Date.now();
  const common = {
    ...(Number.isSafeInteger(Number(body?.serviceId))
      ? { serviceId: Number(body?.serviceId) }
      : {}),
    ...(typeof body?.transId === "string"
      ? { transId: body.transId }
      : {}),
    status: "FAILED" as const,
    errorCode,
  };

  switch (operation) {
    case "check":
      return { ...common, timestamp: now };
    case "create":
      return { ...common, transTime: now };
    case "confirm":
      return { ...common, confirmTime: now };
    case "reverse":
      return { ...common, reverseTime: now };
    case "status":
      return {
        ...common,
        transTime: now,
        confirmTime: null,
        reverseTime: null,
      };
  }
};

export const SendUzumMerchantError = (
  operation: UzumMerchantOperation,
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  let errorCode: UzumMerchantErrorCode;

  if (error instanceof UzumMerchantError) {
    errorCode = error.errorCode;
  } else if (
    (error as FastifyError | undefined)?.validation ||
    (error as FastifyError | undefined)?.code ===
      "FST_ERR_CTP_INVALID_JSON_BODY"
  ) {
    errorCode = validationErrorCode(error as FastifyError);
  } else {
    errorCode = UZUM_MERCHANT_ERROR_CODES.INTERNAL_ERROR;
    request.log.error(
      { error, operation },
      "Uzum Merchant API request failed",
    );
  }

  return reply
    .code(400)
    .send(
      errorResponse(
        operation,
        request.body as MerchantRequestBody | undefined,
        errorCode,
      ),
    );
};

const merchantController = <TBody, TResponse>(
  operation: UzumMerchantOperation,
  service: (body: TBody) => Promise<TResponse>,
) => {
  return async (
    request: FastifyRequest<{ Body: TBody }>,
    reply: FastifyReply,
  ) => {
    try {
      AssertUzumMerchantAuthorization(request.headers.authorization);
      const response = await service(request.body as TBody);
      return reply.code(200).send(response);
    } catch (error) {
      return SendUzumMerchantError(operation, error, request, reply);
    }
  };
};

export const UzumCheckController = merchantController(
  "check",
  CheckUzumMerchantPaymentService,
);

export const UzumCreateController = merchantController(
  "create",
  CreateUzumMerchantTransactionService,
);

export const UzumConfirmController = merchantController(
  "confirm",
  ConfirmUzumMerchantTransactionService,
);

export const UzumReverseController = merchantController(
  "reverse",
  ReverseUzumMerchantTransactionService,
);

export const UzumStatusController = merchantController(
  "status",
  GetUzumMerchantTransactionStatusService,
);

export const UzumMerchantRouteErrorHandler = (
  operation: UzumMerchantOperation,
) => {
  return (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => SendUzumMerchantError(operation, error, request, reply);
};

export const UzumInvalidMethodController = (
  operation: UzumMerchantOperation,
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      AssertUzumMerchantAuthorization(request.headers.authorization);
      throw new UzumMerchantError(
        UZUM_MERCHANT_ERROR_CODES.INVALID_OPERATION,
      );
    } catch (error) {
      return SendUzumMerchantError(operation, error, request, reply);
    }
  };
};
