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

declare interface OperatorAttractionData extends AttractionModelI {}

declare interface OperatorAttractionWithAttractionData extends AttractionOperatorModelI {
  attractions: OperatorAttractionPlain;
}

declare interface OperatorAttractionWithOperatorData extends AttractionOperatorModelI {
  attractions: OperatorAttractionPlain;
  operators: OperatorPlain;
}

declare interface AttractionDTO {
  id: number;
  name: string;
  status: string;
  main_file: number | null;
  dashboard_file: number | null;
  price: number;
  age_limit: number;
  min_height: number;
  max_weight: number;
  duration: number;
  seats: number;
}

declare interface OperatorMeDTOType {
  id: number;
  firstname: string;
  lastname: string;
  phone_number: string;
  file: number | null;
  role: number;
  status: string;
}

declare interface OperatorAttractionResponseDTO {
  operator: OperatorMeDTOType;
  attraction: AttractionDTO;
}
