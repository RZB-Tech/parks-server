declare interface AttractionOperatorWithEmployeeModelI extends AttractionOperatorModelI {
  operators?: EmployeeModelI;
}

declare interface AttractionOperatorResponseDTO {
  id: number;
  attraction: number;
  type: "main" | "assistant";
  status: string;
  operator: {
    id: number;
    firstname: string;
    lastname: string;
    file: number | null;
  } | null;
}
