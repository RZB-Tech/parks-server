declare interface AttractionOperatorParams {
  attractionID: number;
  operatorID: number;
}

declare interface CreateAttractionOperatorData extends Omit<
  AttractionOperatorModelI,
  "id" | "status" | "attraction"
> {}

declare interface UpdateAttractionOperatorData extends Omit<
  AttractionOperatorModelI,
  "id" | "attraction"
> {}
