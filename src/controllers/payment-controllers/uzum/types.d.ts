declare interface UzumRegisterPaymentRequest {
  amount: number;
  clientId: string;
  currency: 860;
  paymentDetails: string;
  orderNumber: string;
  successUrl: string;
  failureUrl: string;
  viewType: "REDIRECT";
  paymentParams: {
    operationType: "PAYMENT";
    payType: "ONE_STEP";
    force3ds?: boolean;
  };
  merchantParams: Record<string, unknown>;
  sessionTimeoutSecs: number;
}

declare interface UzumRegisterPaymentResponse {
  errorCode: number;
  message?: string;
  result?: {
    orderId?: string | null;
    paymentRedirectUrl?: string | null;
  } | null;
}

declare interface UzumOrderStatusResponse {
  errorCode: number;
  message?: string;
  result?: Record<string, unknown> | null;
}

declare interface UzumCallbackBody extends Record<string, unknown> {
  orderId: string;
  operationState: string;
  operationType: string;
  merchantOperationId?: string;
  orderNumber: string;
  rrn?: string;
  cardType?: number;
  bindingId?: string;
}

declare interface UzumCallbackResponse {
  ok: true;
}
