declare interface CashboxOperatorWithEmployeeModelI extends CashboxOperatorModelI {
  operators?: EmployeeModelI;
}

declare interface CashboxOperatorResponseDTO {
  id: number;
  cashbox: number;
  status: string;
  operator: {
    id: number;
    firstname: string;
    lastname: string;
    file: number | null;
  } | null;
}

declare interface CashboxOperatorByEmployee {
  id: number | string;
  status: CashboxOperatorStatusTypes;
  endAt?: string | null;

  operators?: {
    id: number | string;
    firstname: string;
    lastname: string;
    file: number | string | null;
    phone_number: string;
    telegram_username: string;
    createdAt?: Date | string;
    created_at?: Date | string;
    status: EmployeeStatusTypes;
  } | null;

  cashboxes?: {
    id: number | string;
    name: string;
    place: string;
    status: CashboxStatusTypes;
  } | null;
}