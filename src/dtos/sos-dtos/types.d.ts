interface SOSAttractionOperatorDTOData extends AttractionOperatorModelI {
  operators?: EmployeeModelI | null;
  attractions?: AttractionModelI | null;
}

interface SOSCashboxOperatorDTOData extends CashboxOperatorModelI {
  operators?: EmployeeModelI | null;
  cashboxes?: CashboxModelI | null;
}

declare interface SOSReportWithRelationsDTO extends SosModelI {
  attractionOperator?: SOSAttractionOperatorDTOData | null;
  cashboxOperator?: SOSCashboxOperatorDTOData | null;
}
