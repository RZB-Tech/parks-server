declare interface CashboxParams {
  cashboxID: number;
}

declare interface GetCashboxQuery {
  cashboxID: number;
  deviceID: number;
}

declare interface GetCashboxesQuery {
  search: string;
  statuses: string;

  page?: number;
  limit?: number;
}

declare interface CreateCashboxData
  extends Omit<
    CashboxModelI,
    "id" | "status" | "type" | "system_key"
  > {}

declare interface UpdateCashboxData
  extends Omit<CashboxModelI, "id" | "type" | "system_key"> {}

declare interface DeleteCashboxesData {
  cashboxIDs: Array<number>;
}
