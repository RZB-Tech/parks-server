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
import { RoleTypes } from "../../models/postgresql/role-model/enums";
import {
  AttractionModel,
  AttractionOperatorModel,
  CashboxModel,
  CashboxOperatorModel,
  RoleModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { Op, Transaction } from "sequelize";

const OWNER_CREATION_LOCK = "parks-server:create-owner-employee";

const FindOwnerRole = (transaction?: Transaction) =>
  RoleModel.findOne({
    where: { name: RoleTypes.OWNER },
    transaction,
  });

export const GetEmployeeService = async (
  params: EmployeeParams,
): Promise<EmployeeResponseDTO> => {
  const [employee, ownerRole] = await Promise.all([
    EmployeeModel.findByPk(params.employeeID),
    FindOwnerRole(),
  ]);

  if (
    employee == null ||
    (ownerRole && Number(employee.role) === Number(ownerRole.id))
  ) {
    throw NotFound("Employee not found");
  }

  const employeeData = employee.get();
  return EmployeeDTO(employeeData);
};

export const GetEmployeeStatsService = async () => {
  const ownerRole = await FindOwnerRole();

  const rows = await EmployeeModel.findAll({
    where: ownerRole
      ? {
          role: {
            [Op.ne]: ownerRole.id,
          },
        }
      : undefined,
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
  const ownerRole = await FindOwnerRole();
  const ownerRoleID = ownerRole ? Number(ownerRole.id) : null;
  const where: any = ownerRoleID
    ? {
        role: {
          [Op.ne]: ownerRoleID,
        },
      }
    : {};

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
    if (ownerRoleID && Number(query.roles) === ownerRoleID) {
      return {
        employees: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    where.role = query.roles;
  }

  if (query.statuses) {
    const statuses = query.statuses
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);

    where.status = {
      [Op.in]: statuses,
    };
  }

  const { rows, count } = await EmployeeModel.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  const employeeIds = rows.map((employee) => Number(employee.id));

  if (employeeIds.length === 0) {
    return {
      employees: [],
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  const cashboxOperators = await CashboxOperatorModel.findAll({
    where: {
      operator: {
        [Op.in]: employeeIds,
      },
      status: {
        [Op.in]: ["active", "inactive"],
      },
    },
    include: [
      {
        model: CashboxModel,
        as: "cashboxes",
        attributes: ["id", "name"],
        required: true,
      },
    ],
  });

  const attractionOperators = await AttractionOperatorModel.findAll({
    where: {
      operator: {
        [Op.in]: employeeIds,
      },
      status: {
        [Op.in]: ["active", "inactive"],
      },
    },
    include: [
      {
        model: AttractionModel,
        as: "attractions",
        attributes: ["id", "name"],
        required: true,
      },
    ],
  });

  const cashboxesMap = new Map<number, EmployeeShortCashboxDTO[]>();
  const attractionsMap = new Map<number, EmployeeShortAttractionDTO[]>();

  for (const item of cashboxOperators) {
    const plain = item.get({ plain: true }) as CashboxOperatorModelI & {
      cashboxes?: CashboxModelI;
    };

    const operatorID = Number(plain.operator);

    if (!cashboxesMap.has(operatorID)) {
      cashboxesMap.set(operatorID, []);
    }

    if (plain.cashboxes) {
      cashboxesMap.get(operatorID)!.push({
        id: Number(plain.cashboxes.id),
        name: plain.cashboxes.name,
      });
    }
  }

  for (const item of attractionOperators) {
    const plain = item.get({ plain: true }) as AttractionOperatorModelI & {
      attractions?: AttractionModelI;
    };

    const operatorID = Number(plain.operator);

    if (!attractionsMap.has(operatorID)) {
      attractionsMap.set(operatorID, []);
    }

    if (plain.attractions) {
      attractionsMap.get(operatorID)!.push({
        id: Number(plain.attractions.id),
        name: plain.attractions.name,
      });
    }
  }

  return {
    employees: rows.map((employee) => {
      const plainEmployee = employee.get({ plain: true }) as GetEmployeeDTO;

      return EmployeeDTO({
        ...plainEmployee,
        cashboxes: cashboxesMap.get(Number(plainEmployee.id)) ?? [],
        attractions: attractionsMap.get(Number(plainEmployee.id)) ?? [],
      });
    }),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateEmployeesService = async (
  body: CreateEmployeeData,
): Promise<EmployeeResponseDTO> => {
  return sequelize.transaction(async (transaction) => {
    const role = await RoleModel.findOne({
      where: {
        id: body.role,
      },
      transaction,
    });

    if (!role) throw NotFound("Not found role");

    if (role.name === RoleTypes.OWNER) {
      await sequelize.query(
        "SELECT pg_advisory_xact_lock(hashtext(:lockName))",
        {
          replacements: { lockName: OWNER_CREATION_LOCK },
          transaction,
        },
      );

      const ownerExists = await EmployeeModel.count({
        where: { role: role.id },
        paranoid: false,
        transaction,
      });

      if (ownerExists > 0) {
        throw Conflict("Owner employee already exists");
      }
    }

    const findEmployee = await EmployeeModel.findOne({
      where: {
        phone_number: body.phone_number,
      },
      transaction,
    });

    if (findEmployee !== null) {
      throw Conflict("Employee already exists at this phone number");
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const employee = await EmployeeModel.create(
      {
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
      },
      { transaction },
    );

    const employeeData = employee.get();
    return EmployeeDTO(employeeData);
  });
};

export const UpdateEmployeesService = async (
  params: EmployeeParams,
  body: UpdateEmployeeData,
): Promise<EmployeeResponseDTO> => {
  const [employee, ownerRole] = await Promise.all([
    EmployeeModel.findByPk(params.employeeID),
    FindOwnerRole(),
  ]);

  if (
    employee == null ||
    (ownerRole && Number(employee.role) === Number(ownerRole.id))
  ) {
    throw NotFound("Employee not found");
  }

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
    if (role.name === RoleTypes.OWNER) {
      throw BadRequest("Owner role can only be assigned during creation");
    }
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
    const ownerRole = await FindOwnerRole(transaction);
    const employeeWhere = {
      id: {
        [Op.in]: body.employeeIDs,
      },
      ...(ownerRole && {
        role: {
          [Op.ne]: ownerRole.id,
        },
      }),
    };

    const existingCount = await EmployeeModel.count({
      where: employeeWhere,
      transaction,
    });

    if (existingCount !== body.employeeIDs.length)
      throw NotFound("Employee not found");

    await EmployeeModel.destroy({
      where: employeeWhere,
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
