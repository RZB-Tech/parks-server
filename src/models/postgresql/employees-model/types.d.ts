declare interface EmployeeModelI {
  id: number;
  firstname: string;
  lastname: string;
  date_of_birth: Date;
  phone_number: string;
  telegram_username: string;
  role: number;
  status: import("./enums").EmployeeStatusTypes;
  salary: number | null;
  file: number | null;
  password: string;
}
