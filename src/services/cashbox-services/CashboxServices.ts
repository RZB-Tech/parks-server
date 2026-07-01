import { Op } from "sequelize";
import {
  CashboxDTO,
  CashboxWithOperatorsDTO,
} from "../../dtos/cashbox-dtos/CashboxDto";
import { Conflict, NotFound } from "../../exceptions";
import { CashboxModel } from "../../models/postgresql/cashbox-model/CashboxModel";
import { CashboxOperatorStatusTypes } from "../../models/postgresql/cashbox-operator-model/enums";
import {
  CashboxOperatorModel,
  EmployeeModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { CashboxStatusTypes } from "../../models/postgresql/cashbox-model/enums";

export const GetCashboxService = async (query: GetCashboxQuery) => {
  const orWhere: any[] = [];
 
   if (query.cashboxID) {
     orWhere.push({
       id: Number(query.cashboxID),
     });
   }
 
   if (query.deviceID) {
     orWhere.push({
       device: Number(query.deviceID),
     });
   }
 
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

  const cashboxData = cashbox.get({ plain: true });

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
            attributes: ["id", "firstname", "lastname", "file"],
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
  });

  return CashboxDTO(cashbox);
};

export const UpdateCashboxesService = async (
  params: CashboxParams,
  body: UpdateCashboxData,
): Promise<CashboxResnponseDTO> => {
  const cashbox = await CashboxModel.findByPk(params.cashboxID);

  if (cashbox == null) throw NotFound("Cashbox not found");

  if (body.name !== undefined && body.name !== cashbox.name) {
    const findCashbox = await CashboxModel.findOne({
      where: {
        name: body.name,
      },
    });

    if (findCashbox !== null) {
      throw Conflict("Cashbox already exists at this name");
    }
  }

  await cashbox.update({
    device: body.device,
    name: body.name,
    status: body.status,
    place: body.place,
    description: body.description,
  });

  const cashboxData = cashbox.get();
  return CashboxDTO(cashboxData);
};

export const DeleteCashboxesService = async (body: DeleteCashboxesData) => {
  const transaction = await sequelize.transaction();

  try {
    const cashboxIDs = [...new Set(body.cashboxIDs)];

    const existingCount = await CashboxModel.count({
      where: {
        id: {
          [Op.in]: cashboxIDs,
        },
      },
      transaction,
    });

    if (existingCount !== cashboxIDs.length) {
      throw NotFound("Cashbox not found");
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
