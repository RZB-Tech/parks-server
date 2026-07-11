declare interface AttractionsStatusDto {
  attractions: number;
  active: number;
  inactive: number;
  stopped: number;
  maintenance: number;
  closed: number;
}

type AttractionWithOperatorsPlain = AttractionModelI & {
  attraction_operator?: Array<
    AttractionOperatorModelI & {
      operators?: Pick<
        EmployeeModelI,
        "id" | "firstname" | "lastname" | "file"
      >;
    }
  >;
};
