declare interface AttractionParams {
  attractionID: number;
}

declare interface GetAttractionsQuery {
  search: string;
  categories: number;
  statuses: string;

  page?: number;
  limit?: number;
}

declare interface CreateAttractionData extends Omit<AttractionModelI, "id"> {}

declare interface UpdateAttractionData extends Omit<AttractionModelI, "id"> {}

declare interface DeleteAttractionsData {
  attractionIDs: Array<number>;
}
