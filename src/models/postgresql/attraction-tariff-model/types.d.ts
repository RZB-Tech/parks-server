declare interface AttractionTariffModelI {
  id: number;
  attraction: number;
  name: string;
  price: number;
  status: import("./enums").AttractionTariffStatusTypes;
  sort_order: number;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

declare interface AttractionTariffInput {
  id?: number;
  name: string;
  price: number;
  sort_order?: number;
}
