export enum CardTransactionType {
  TOPUP = "topup",
  PAYMENT = "payment",
  REFUND = "refund",
}

export enum PaymentType {
  CASH = "cash",
  CARD = "card",
  ONLINE = "online",
}

export enum PaymentCardType {
  UZCARD = "uzcard",
  HUMO = "humo",
  NFC = "nfc"
}

export enum PaymentServiceType {
  UZUM = "uzum",
  PAYME = "payme",
  CLICK = "click",
}

export enum CardTransactionStatusTypes {
  SUCCESS = "success",
  CANCELLED = "cancelled",
  FAILED = "failed",
}
