export const EmployeeDTO = (employee: GetEmployeeDTO): EmployeeResponseDTO => ({
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
  ...(employee.cashboxes && employee.cashboxes.length > 0 && {
    cashboxes: employee.cashboxes,
  }),

  ...(employee.attractions && employee.attractions.length > 0 && {
    attractions: employee.attractions,
  }),
});