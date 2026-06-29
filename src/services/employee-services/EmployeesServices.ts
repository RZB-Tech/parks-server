import {
  CreateEmployeeData,
  DeleteEmployeesData,
  EmployeeParams,
  GetEmployeesQuery,
  UpdateEmployeeData,
} from "../../controllers/employee-controllers/types";
import { EmployeeDTO } from "../../dtos/employees-dtos/EmployeeDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import bcrypt from "bcrypt";
import { EmployeeStatusTypes } from "../../models/postgresql/employees-model/enums";
import { RoleModel, sequelize } from "../../plugins/db/postgresql/db";
import { Op } from "sequelize";

export const GetEmployeeService = async (
  params: EmployeeParams,
): Promise<EmployeeResponseDTO> => {
  const employee = await EmployeeModel.findByPk(params.employeeID);

  if (employee == null) throw NotFound("Employee not found");

  const employeeData = employee.get();
  return EmployeeDTO(employeeData);
};

export const GetEmployeeStatsService = async () => {
  const rows = await EmployeeModel.findAll({
    attributes: [
      "status",
      [
        EmployeeModel.sequelize!.fn(
          "COUNT",
          EmployeeModel.sequelize!.col("id"),
        ),
        "count",
      ],
    ],
    group: ["status"],
    raw: true,
  });

  const result: EmployeeStatusDTO = {
    employees: 0,
    active: 0,
    inactive: 0,
    vacation: 0,
    fired: 0,
  };

  let total = 0;

  for (const row of rows as any[]) {
    const status = row.status as EmployeeStatusTypes;
    const count = Number(row.count);

    if (status in result) {
      result[status] = count as any;
      total += count;
    }
  }

  result.employees = total;

  return result;
};

export const GetEmployeesService = async (
  query: GetEmployeesQuery,
): Promise<EmployeesPaginationResponseDTO> => {
  const where: any = {};

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  if (query.search) {
    where[Op.or] = [
      {
        firstname: {
          [Op.iLike]: `%${query.search}%`,
        },
      },
      {
        lastname: {
          [Op.iLike]: `%${query.search}%`,
        },
      },
      {
        phone_number: {
          [Op.iLike]: `%${query.search}%`,
        },
      },
      {
        telegram_username: {
          [Op.iLike]: `%${query.search}%`,
        },
      },
    ];
  }

  if (query.roles) {
    where.role = query.roles;
  }

  if (query.statuses) {
    where.status = query.statuses;
  }

  const { rows, count } = await EmployeeModel.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'DESC']]
  });

  return {
    employees: rows.map((employee) => EmployeeDTO(employee)),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateEmployeesService = async (
  body: CreateEmployeeData,
): Promise<EmployeeResponseDTO> => {
  const findEmployee = await EmployeeModel.findOne({
    where: {
      phone_number: body.phone_number,
    },
  });

  if (findEmployee !== null)
    throw Conflict("Employee already exists at this phone number");

  const role = await RoleModel.findOne({
    where: {
      id: body.role,
    },
  });

  if (!role) throw NotFound("Not found role");

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const employee = await EmployeeModel.create({
    firstname: body.firstname,
    lastname: body.lastname,
    date_of_birth: body.date_of_birth,
    phone_number: body.phone_number,
    telegram_username: body.telegram_username,
    role: body.role,
    salary: body.salary,
    file: body.file,
    password: hashedPassword,
    status: EmployeeStatusTypes.INACTIVE,
  });

  const employeeData = employee.get();
  return EmployeeDTO(employeeData);
};

export const UpdateEmployeesService = async (
  params: EmployeeParams,
  body: UpdateEmployeeData,
): Promise<EmployeeResponseDTO> => {
  const employee = await EmployeeModel.findByPk(params.employeeID);

  if (employee == null) throw NotFound("Employee not found");

  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }

  if (body.role) {
    const role = await RoleModel.findOne({
      where: {
        id: body.role,
      },
    });

    if (!role) throw NotFound("Not found role");
  }

  if (
    body.status &&
    !Object.values(EmployeeStatusTypes).includes(
      body.status as EmployeeStatusTypes,
    )
  ) {
    throw BadRequest("Invalid employee status");
  }

  await employee.update({
    firstname: body.firstname,
    lastname: body.lastname,
    date_of_birth: body.date_of_birth,
    phone_number: body.phone_number,
    telegram_username: body.telegram_username,
    role: body.role,
    status: body.status,
    salary: body.salary,
    file: body.file,
    password: body.password,
  });

  const employeeData = employee.get();
  return EmployeeDTO(employeeData);
};

export const DeleteEmployeesService = async (body: DeleteEmployeesData) => {
  const transaction = await sequelize.transaction();

  try {
    const existingCount = await EmployeeModel.count({
      where: {
        id: {
          [Op.in]: body.employeeIDs,
        },
      },
      transaction,
    });

    if (existingCount !== body.employeeIDs.length)
      throw NotFound("Employee not found");

    await EmployeeModel.destroy({
      where: {
        id: {
          [Op.in]: body.employeeIDs,
        },
      },
      force: true,
      transaction,
    });

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
