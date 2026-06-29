declare interface AttractionOperatorModelI {
  id: number;
  attraction: number;
  operator: number;
  type: import("./enums").AttractionOperatorTypes;
  status: import("./enums").AttractionOperatorStatusTypes;
}
