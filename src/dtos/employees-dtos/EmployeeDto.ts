export const EmployeeDTO = (employee: EmployeeModelI): EmployeeResponseDTO => ({
  id: employee.id,
  firstname: employee.firstname,
  lastname: employee.lastname,
  date_of_birth: employee.date_of_birth,
  phone_number: employee.phone_number,
  telegram_username: employee.telegram_username,
  role: employee.role,
  status: employee.status,
  salary: employee.salary,
  file: employee.file,
});
