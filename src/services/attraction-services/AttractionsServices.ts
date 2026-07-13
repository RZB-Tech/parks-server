import { Op } from "sequelize";
import {
  AttractionDTO,
  AttractionWithOperatorsDTO,
} from "../../dtos/attractions-dtos/AttractionDto";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AttractionStatusTypes } from "../../models/postgresql/attraction-model/enums";
import {
  AttractionModel,
  AttractionOperatorModel,
  AttractionReportModel,
  EmployeeModel,
  FileModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";

export const GetAttractionService = async (query: GetAttractionQuery) => {
  const orWhere: any[] = [];

  if (query.attractionID) {
    orWhere.push({
      id: Number(query.attractionID),
    });
  }

  if (query.deviceID) {
    orWhere.push({
      device: Number(query.deviceID),
    });
  }

  const attraction = await AttractionModel.findOne({
    where: {
      [Op.or]: orWhere,
    },
    include: [
      {
        model: AttractionOperatorModel,
        as: "attraction_operator",
        required: false,
        attributes: ["id", "operator", "type", "status"],
        where: {
          status: AttractionOperatorStatusTypes.ACTIVE,
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
    order: [
      [
        { model: AttractionOperatorModel, as: "attraction_operator" },
        "id",
        "ASC",
      ],
    ],
  });

  if (!attraction) {
    throw NotFound("Attraction not found");
  }

  const attractionData = attraction.get({ plain: true });

  return AttractionWithOperatorsDTO(attractionData);
};

export const GetAttractionStatsService = async () => {
  const rows = await AttractionModel.findAll({
    attributes: [
      "status",
      [
        AttractionModel.sequelize!.fn(
          "COUNT",
          AttractionModel.sequelize!.col("id"),
        ),
        "count",
      ],
    ],
    group: ["status"],
    raw: true,
  });

  const result: AttractionsStatusDto = {
    attractions: 0,
    active: 0,
    inactive: 0,
    stopped: 0,
    maintenance: 0,
    closed: 0,
  };

  let total = 0;

  for (const row of rows as any[]) {
    const status = row.status as AttractionStatusTypes;
    const count = Number(row.count);

    if (status in result) {
      result[status] = count as any;
      total += count;
    }
  }

  result.attractions = total;

  return result;
};

export const GetAttractionsService = async (query: GetAttractionsQuery) => {
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
        manufacturer: { [Op.iLike]: `%${query.search}%` },
      },
    ];
  }

  if (query.statuses) {
    where.status = Array.isArray(query.statuses)
      ? { [Op.in]: query.statuses }
      : query.statuses;
  }

  const { rows, count } = await AttractionModel.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  const attractionsData = rows.map((attraction) =>
    attraction.get({ plain: true }),
  );

  const attractionIDs = attractionsData.map((attraction) => attraction.id);

  const operators = await AttractionOperatorModel.findAll({
    where: {
      attraction: {
        [Op.in]: attractionIDs,
      },
      status: AttractionOperatorStatusTypes.ACTIVE,
    },
    attributes: ["id", "attraction", "operator", "type", "status"],
    include: [
      {
        model: EmployeeModel,
        as: "operators",
        required: false,
        attributes: ["id", "firstname", "lastname", "file"],
      },
    ],
    order: [["id", "ASC"]],
  });

  const operatorsData = operators.map((operator) =>
    operator.get({ plain: true }),
  );

  const attractionsWithOperators = attractionsData.map((attraction) => {
    const attractionOperators = operatorsData.filter(
      (operator) => Number(operator.attraction) === Number(attraction.id),
    );

    return AttractionWithOperatorsDTO({
      ...attraction,
      attraction_operator: attractionOperators,
    });
  });

  return {
    attractions: attractionsWithOperators,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateAttractionsService = async (body: CreateAttractionData) => {
  const findAttraction = await AttractionModel.findOne({
    where: {
      name: body.name,
    },
  });

  if (findAttraction !== null)
    throw Conflict("Attraction already exists at this name");

  const fileIds = [
    body.dashboard_file,
    body.main_file,
    ...(body.files ?? []),
    ...(body.sub_attraction_files ?? []),
  ]
    .filter((id) => id !== null && id !== undefined)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  const uniqueFileIds = [...new Set(fileIds)];

  if (uniqueFileIds.length > 0) {
    const filesCount = await FileModel.count({
      where: {
        id: {
          [Op.in]: uniqueFileIds,
        },
      },
    });

    if (filesCount !== uniqueFileIds.length) {
      throw NotFound("One or more files not found!");
    }
  }

  const attraction = await AttractionModel.create({
    name: body.name,
    manufacturer: body.manufacturer,
    status: AttractionStatusTypes.INACTIVE,
    dashboard_file: body.dashboard_file ?? null,
    main_file: body.main_file ?? null,
    files: body.files ?? null,
    sub_attraction_files: body.sub_attraction_files ?? null,
    price: body.price,
    duration: body.duration,
    seats: body.seats,
    age_limit: body.age_limit,
    min_height: body.min_height,
    max_weight: body.max_weight,
    description: body.description,
  });

  return AttractionDTO(attraction);
};

export const UpdateAttractionsService = async (
  params: AttractionParams,
  body: UpdateAttractionData,
) => {
  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("Attraction ID is invalid!");
  }

  const sequelize = AttractionModel.sequelize!;

  return await sequelize.transaction(async (transaction) => {
    /*
     * Attractionni parallel update va status o‘zgarishlaridan
     * himoyalash uchun lock bilan olamiz.
     */
    const attraction = await AttractionModel.findByPk(attractionID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!attraction) {
      throw NotFound("Attraction not found!");
    }

    /*
     * Attraction nomi o‘zgartirilayotgan bo‘lsa,
     * xuddi shu nomli boshqa attraction mavjudligini tekshiramiz.
     */
    if (body.name !== undefined && body.name !== attraction.name) {
      const existingAttraction = await AttractionModel.findOne({
        where: {
          name: body.name,
          id: {
            [Op.ne]: attraction.id,
          },
        },
        transaction,
      });

      if (existingAttraction) {
        throw Conflict("Attraction already exists with this name!");
      }
    }

    /*
     * Yuborilgan fayllar bazada mavjudligini tekshiramiz.
     */
    const fileIds = [
      body.dashboard_file,
      body.main_file,
      ...(body.files ?? []),
      ...(body.sub_attraction_files ?? []),
    ]
      .filter((id) => id !== null && id !== undefined)
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);

    const uniqueFileIds = [...new Set(fileIds)];

    if (uniqueFileIds.length > 0) {
      const filesCount = await FileModel.count({
        where: {
          id: {
            [Op.in]: uniqueFileIds,
          },
        },
      });

      if (filesCount !== uniqueFileIds.length) {
        throw NotFound("One or more files not found!");
      }
    }

    const isStatusChanging =
      body.status !== undefined && body.status !== attraction.status;

    if (isStatusChanging) {
      /*
       * ACTIVE attractionni boshqa statusga o‘tkazishdan
       * oldin barcha OPEN va STOPPED X/Z reportlar
       * yopilgan bo‘lishi kerak.
       */
      if (
        attraction.status === AttractionStatusTypes.ACTIVE &&
        body.status !== AttractionStatusTypes.ACTIVE
      ) {
        const activeReport = await AttractionReportModel.findOne({
          where: {
            attraction: attraction.id,
            status: {
              [Op.in]: [
                AttractionReportStatusTypes.OPEN,
                AttractionReportStatusTypes.STOPPED,
              ],
            },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (activeReport) {
          throw BadRequest(
            "This attraction is currently in use. Close all X and Z reports before changing its status!",
          );
        }
      }

      /*
       * Attractionni qo‘lda ACTIVE qilish mumkin emas.
       * U X-report ochilganda avtomatik ACTIVE bo‘ladi.
       */
      if (
        attraction.status !== AttractionStatusTypes.ACTIVE &&
        body.status === AttractionStatusTypes.ACTIVE
      ) {
        throw BadRequest(
          "This attraction cannot be activated manually because no operator is currently working on it. Open an X report to activate the attraction!",
        );
      }
    }

    /*
     * Faqat body’da yuborilgan fieldlarni yangilaymiz.
     * undefined fieldlar eski qiymatini saqlab qoladi.
     */
    await attraction.update(
      {
        ...(body.device !== undefined && {
          device: body.device,
        }),

        ...(body.name !== undefined && {
          name: body.name,
        }),

        ...(body.manufacturer !== undefined && {
          manufacturer: body.manufacturer,
        }),

        ...(body.status !== undefined && {
          status: body.status,
        }),

        ...(body.dashboard_file !== undefined && {
          dashboard_file: body.dashboard_file,
        }),

        ...(body.main_file !== undefined && {
          main_file: body.main_file,
        }),

        ...(body.files !== undefined && {
          files: body.files,
        }),

        ...(body.sub_attraction_files !== undefined && {
          sub_attraction_files: body.sub_attraction_files,
        }),

        ...(body.price !== undefined && {
          price: body.price,
        }),

        ...(body.duration !== undefined && {
          duration: body.duration,
        }),

        ...(body.seats !== undefined && {
          seats: body.seats,
        }),

        ...(body.age_limit !== undefined && {
          age_limit: body.age_limit,
        }),

        ...(body.min_height !== undefined && {
          min_height: body.min_height,
        }),

        ...(body.max_weight !== undefined && {
          max_weight: body.max_weight,
        }),

        ...(body.description !== undefined && {
          description: body.description,
        }),
      },
      {
        transaction,
      },
    );

    return AttractionDTO(
      attraction.get({
        plain: true,
      }),
    );
  });
};

export const DeleteAttractionsService = async (body: DeleteAttractionsData) => {
  const transaction = await sequelize.transaction();

  try {
    const attractionIDs = [...new Set(body.attractionIDs)];

    const existingCount = await AttractionModel.count({
      where: {
        id: {
          [Op.in]: attractionIDs,
        },
      },
      transaction,
    });

    if (existingCount !== attractionIDs.length) {
      throw NotFound("Attraction not found");
    }

    await AttractionModel.destroy({
      where: {
        id: {
          [Op.in]: attractionIDs,
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
