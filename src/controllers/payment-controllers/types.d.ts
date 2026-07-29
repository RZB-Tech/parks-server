declare type PaymeRpcID = number | null;

declare type PaymeLocalizedMessage = {
  uz: string;
  ru: string;
  en: string;
};

declare interface PaymeRpcRequest {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

declare interface PaymeRpcError {
  code: number;
  message: PaymeLocalizedMessage;
  data?: string | null;
}

declare type PaymeRpcResponse =
  | {
      id: PaymeRpcID;
      result: Record<string, unknown>;
    }
  | {
      id: PaymeRpcID;
      error: PaymeRpcError;
    };

declare type PaymeMethodName =
  | "CheckPerformTransaction"
  | "CreateTransaction"
  | "PerformTransaction"
  | "CancelTransaction"
  | "CheckTransaction"
  | "GetStatement";

declare interface PaymeCheckPerformTransactionParams
  extends Record<string, unknown> {
  amount: number;
  account: {
    order_id: string | number;
  };
}

declare interface PaymeCreateTransactionParams
  extends PaymeCheckPerformTransactionParams {
  id: string;
  time: number;
}

declare interface PaymePerformTransactionParams
  extends Record<string, unknown> {
  id: string;
}

declare interface PaymeCancelTransactionParams
  extends PaymePerformTransactionParams {
  reason: number;
}

declare interface PaymeGetStatementParams extends Record<string, unknown> {
  from: number;
  to: number;
}
