import { Op } from "sequelize";
import {
  CashboxDTO,
  CashboxWithOperatorsDTO,
} from "../../dtos/cashbox-dtos/CashboxDto";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../exceptions";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import {
  CashboxOperatorModel,
  CashboxReportModel,
  EmployeeModel,
  RoleModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";
import { CashboxReportStatusTypes } from "../../models/postgresql/cashbox-report-model/enums";

export const GetCashboxService = async (
  operatorID: number,
  query: GetCashboxQuery,
) => {
  if (!operatorID || Number.isNaN(Number(operatorID))) {
    throw BadRequest("Operator ID is invalid!");
  }

  const orWhere: any[] = [];

  if (query.cashboxID) {
    const cashboxID = Number(query.cashboxID);

    if (!cashboxID || Number.isNaN(cashboxID)) {
      throw BadRequest("Cashbox ID is invalid!");
    }

    orWhere.push({
      id: cashboxID,
    });
  }

  if (query.deviceID) {
    const deviceID = Number(query.deviceID);

    if (!deviceID || Number.isNaN(deviceID)) {
      throw BadRequest("Device ID is invalid!");
    }

    orWhere.push({
      device: deviceID,
    });
  }

  if (orWhere.length === 0) {
    throw BadRequest("Cashbox ID or Device ID is required!");
  }

  const currentOperator = await EmployeeModel.findByPk(operatorID, {
    include: [
      {
        model: RoleModel,
        as: "roles",
        required: true,
        attributes: ["id", "name"],
      },
    ],
  });

  if (!currentOperator) {
    throw NotFound("Operator not found!");
  }

  const currentOperatorData = currentOperator.get({
    plain: true,
  }) as EmployeeModelI & {
    roles?: {
      id: number;
      name: string;
    };
  };

  const adminRoles = [
    "superadmin",
    "head_cashier",
    "head_accountant",
    "accountant",
  ];

  const isAdmin = adminRoles.includes(currentOperatorData.roles?.name || "");

  const cashbox = await CashboxModel.findOne({
    where: {
      [Op.or]: orWhere,
    },
    include: [
      {
        model: CashboxOperatorModel,
        as: "cashbox_operator",
        required: false,
        where: {
          status: CashboxOperatorStatusTypes.ACTIVE,
        },
        include: [
          {
            model: EmployeeModel,
            as: "operators",
            required: false,
          },
        ],
      },
    ],
  });

  if (!cashbox) {
    throw NotFound("Cashbox not found");
  }

  const cashboxData = cashbox.get({
    plain: true,
  }) as CashboxModelI & {
    cashbox_operator?: Array<CashboxOperatorModelI>;
  };

  const isCashboxOperator = Array.isArray(cashboxData.cashbox_operator)
    ? cashboxData.cashbox_operator.some(
        (item) => Number(item.operator) === Number(operatorID),
      )
    : false;

  if (!isAdmin && !isCashboxOperator) {
    throw Forbidden("You do not have access to this cashbox!");
  }

  return CashboxWithOperatorsDTO(cashboxData);
};

export const GetCashboxStatsService = async () => {
  const rows = await CashboxModel.findAll({
    attributes: [
      "status",
      [
        CashboxModel.sequelize!.fn("COUNT", CashboxModel.sequelize!.col("id")),
        "count",
      ],
    ],
    group: ["status"],
    raw: true,
  });

  const result: CashboxesStatusDto = {
    cashboxes: 0,
    active: 0,
    inactive: 0,
    stopped: 0,
    maintenance: 0,
    closed: 0,
  };

  let total = 0;

  for (const row of rows as any[]) {
    const status = row.status as CashboxStatusTypes;
    const count = Number(row.count);

    if (status in result) {
      result[status] = count as any;
      total += count;
    }
  }

  result.cashboxes = total;

  return result;
};

export const GetCashboxesService = async (query: GetCashboxesQuery) => {
  const where: any = {};

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  if (query.search) {
    where[Op.or] = [
      {
        name: { [Op.iLike]: `%${query.search}%` },
      },
      {
        place: { [Op.iLike]: `%${query.search}%` },
      },
      {
        description: { [Op.iLike]: `%${query.search}%` },
      },
    ];
  }

  if (query.statuses) {
    where.status = Array.isArray(query.statuses)
      ? { [Op.in]: query.statuses }
      : query.statuses;
  }

  const { rows, count } = await CashboxModel.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "DESC"]],
    include: [
      {
        model: CashboxOperatorModel,
        as: "cashbox_operator",
        required: false,
        where: {
          status: CashboxOperatorStatusTypes.ACTIVE,
        },
        include: [
          {
            model: EmployeeModel,
            as: "operators",
            required: false,
          },
        ],
      },
    ],
  });

  const cashboxesData = rows.map((r) => r.get({ plain: true }));

  return {
    cashboxes: cashboxesData.map((cashbox) => CashboxWithOperatorsDTO(cashbox)),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateCashboxesService = async (
  body: CreateCashboxData,
): Promise<CashboxResnponseDTO> => {
  const findCashbox = await CashboxModel.findOne({
    where: {
      name: body.name,
    },
  });

  if (findCashbox !== null)
    throw Conflict("Cashbox already exists at this name");

  const cashbox = await CashboxModel.create({
    name: body.name,
    place: body.place,
    status: CashboxOperatorStatusTypes.INACTIVE,
    description: body.description,
    latitude: body.latitude,
    longitude: body.longitude,
  });

  return CashboxDTO(cashbox);
};

export const UpdateCashboxesService = async (
  params: CashboxParams,
  body: UpdateCashboxData,
): Promise<CashboxResnponseDTO> => {
  const cashboxID = Number(params.cashboxID);

  if (!cashboxID || Number.isNaN(cashboxID)) {
    throw BadRequest("Cashbox ID is invalid!");
  }

  const sequelize = CashboxModel.sequelize!;

  return await sequelize.transaction(async (dbTransaction) => {
    const cashbox = await CashboxModel.findByPk(cashboxID, {
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!cashbox) {
      throw NotFound("Cashbox not found!");
    }

    if (body.name !== undefined && body.name !== cashbox.name) {
      const existingCashbox = await CashboxModel.findOne({
        where: {
          name: body.name,
          id: {
            [Op.ne]: cashbox.id,
          },
        },
        transaction: dbTransaction,
      });

      if (existingCashbox) {
        throw Conflict("Cashbox already exists with this name!");
      }
    }

    const isStatusChanging =
      body.status !== undefined && body.status !== cashbox.status;

    if (isStatusChanging) {
      /**
       * ACTIVE cashboxni inactive, blocked, maintenance yoki
       * boshqa statusga o'tkazishdan oldin barcha faol reportlar
       * yopilgan bo'lishi kerak.
       */
      if (
        cashbox.status === CashboxStatusTypes.ACTIVE &&
        body.status !== CashboxStatusTypes.ACTIVE
      ) {
        const activeReport = await CashboxReportModel.findOne({
          where: {
            cashbox: cashbox.id,
            status: {
              [Op.in]: [
                CashboxReportStatusTypes.OPEN,
                CashboxReportStatusTypes.STOPPED,
              ],
            },
          },
          transaction: dbTransaction,
          lock: dbTransaction.LOCK.UPDATE,
        });

        if (activeReport) {
          throw BadRequest(
            "This cashbox is currently in use. Close all X and Z reports before changing its status!",
          );
        }
      }

      /**
       * Cashboxni qo'lda ACTIVE qilish mumkin emas.
       * U X-report ochilganda avtomatik ACTIVE bo'ladi.
       */
      if (
        cashbox.status !== CashboxStatusTypes.ACTIVE &&
        body.status === CashboxStatusTypes.ACTIVE
      ) {
        throw BadRequest(
          "This cashbox cannot be activated manually because no operator is currently working on it. Open an X report to activate the cashbox!",
        );
      }
    }

    await cashbox.update(
      {
        ...(body.device !== undefined && { device: body.device }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.place !== undefined && { place: body.place }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.latitude !== undefined && {
          latitude: body.latitude,
        }),
        ...(body.longitude !== undefined && {
          longitude: body.longitude,
        }),
      },
      {
        transaction: dbTransaction,
      },
    );

    return CashboxDTO(
      cashbox.get({
        plain: true,
      }),
    );
  });
};

export const DeleteCashboxesService = async (body: DeleteCashboxesData) => {
  const transaction = await sequelize.transaction();

  try {
    const cashboxIDs = [...new Set(body.cashboxIDs.map((id) => Number(id)))];

    if (cashboxIDs.length === 0) {
      throw BadRequest("Cashbox IDs are required!");
    }

    const cashboxes = await CashboxModel.findAll({
      where: {
        id: {
          [Op.in]: cashboxIDs,
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (cashboxes.length !== cashboxIDs.length) {
      throw NotFound("Cashbox not found!");
    }

    const activeCashbox = cashboxes.find(
      (cashbox) => cashbox.status === CashboxStatusTypes.ACTIVE,
    );

    if (activeCashbox) {
      throw BadRequest(
        `Cashbox "${activeCashbox.name}" is currently active and cannot be deleted. Close all reports first!`,
      );
    }

    const activeReport = await CashboxReportModel.findOne({
      where: {
        cashbox: {
          [Op.in]: cashboxIDs,
        },
        status: {
          [Op.in]: [
            CashboxReportStatusTypes.OPEN,
            CashboxReportStatusTypes.STOPPED,
          ],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (activeReport) {
      throw BadRequest(
        "One or more cashboxes are currently in use. Close all X and Z reports before deleting them!",
      );
    }

    await CashboxModel.destroy({
      where: {
        id: {
          [Op.in]: cashboxIDs,
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
