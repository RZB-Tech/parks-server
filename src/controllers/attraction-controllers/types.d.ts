declare interface AttractionParams {
  attractionID: number;
}

declare interface GetAttractionQuery {
  attractionID: number;
  deviceID: number;
}

declare interface GetAttractionsQuery {
  search: string;
  categories: number;
  statuses: string;

  page?: number;
  limit?: number;
}

declare interface CreateAttractionData
  extends Omit<
    AttractionModelI,
    | "id"
    | "device"
    | "status"
    | "price"
    | "tariffs"
    | "size"
    | "duration"
    | "rules"
  > {
  price: number | null;
  size?: number;
  duration: string;
  rules?: AttractionRulesInput;
  tariffs?: AttractionTariffInput[];
}

declare interface UpdateAttractionData
  extends Partial<
    Omit<AttractionModelI, "id" | "tariffs" | "duration" | "rules">
  > {
  duration?: string;
  rules?: AttractionRulesInput;
  tariffs?: AttractionTariffInput[];
}

declare interface DeleteAttractionsData {
  attractionIDs: Array<number>;
}
