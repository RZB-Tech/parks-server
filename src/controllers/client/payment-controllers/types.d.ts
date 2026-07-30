declare interface CreateClientPaymeOrderData {
  card: number;
  amount: number;
}

declare interface CreateClientPaymeOrderResponse {
  order_id: string;
  amount: number;
  status: import("../../../models/postgresql/payment-orders-model/enums").PaymentOrderStatusTypes;
  checkout_url: string;
}

declare interface CreateClientClickOrderData {
  card: number;
  amount: number;
}

declare interface CreateClientClickOrderResponse {
  order_id: string;
  amount: number;
  status: import("../../../models/postgresql/payment-orders-model/enums").PaymentOrderStatusTypes;
  checkout_url: string;
}
