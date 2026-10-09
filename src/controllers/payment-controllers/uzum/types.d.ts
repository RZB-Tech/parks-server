declare type UzumMerchantParams = Record<
  string,
  string | number | boolean | null
>;

declare type UzumMerchantData = Record<string, { value: string }>;

declare interface UzumCheckRequest {
  serviceId: number;
  timestamp: number;
  params: UzumMerchantParams;
}

declare interface UzumCreateRequest extends UzumCheckRequest {
  transId: string;
  amount: number;
}

declare interface UzumConfirmRequest {
  serviceId: number;
  timestamp: number;
  transId: string;
  paymentSource: string;
  tariff?: string | null;
  processingReferenceNumber?: string | null;
  phone: string;
  cardType?: number | null;
}

declare interface UzumReverseRequest {
  serviceId: number;
  timestamp: number;
  transId: string;
}

declare interface UzumStatusRequest extends UzumReverseRequest {}

declare interface UzumCheckResponse {
  serviceId: number;
  timestamp: number;
  status: "OK";
  data: UzumMerchantData;
}

declare interface UzumCreateResponse {
  serviceId: number;
  transId: string;
  status: "CREATED";
  transTime: number;
  amount: number;
}

declare interface UzumConfirmResponse {
  serviceId: number;
  transId: string;
  status: "CONFIRMED";
  confirmTime: number;
  amount: number;
}

declare interface UzumReverseResponse {
  serviceId: number;
  transId: string;
  status: "REVERSED";
  reverseTime: number;
  amount: number;
}

declare interface UzumStatusResponse {
  serviceId: number;
  transId: string;
  status: "CREATED" | "CONFIRMED" | "REVERSED";
  transTime: number;
  confirmTime: number | null;
  reverseTime: number | null;
  data: UzumMerchantData;
  amount: number;
}

declare type UzumMerchantOperation =
  | "check"
  | "create"
  | "confirm"
  | "reverse"
  | "status";
