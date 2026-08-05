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
  AttractionTariffModel,
  EmployeeModel,
  FileModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { AttractionTariffStatusTypes } from "../../models/postgresql/attraction-tariff-model/enums";
import {
  CreateAttractionTariffsService,
  DeactivateAttractionTariffsService,
  NormalizeAttractionTariffs,
  SyncAttractionTariffsService,
} from "../attraction-tariffs-services/AttractionTariffsServices";

const NormalizeAttractionSize = (value: number | undefined): number => {
  const size = value === undefined ? 1 : Number(value);

  if (!Number.isFinite(size) || size <= 0) {
    throw BadRequest("Attraction size is invalid!");
  }

  return size;
};

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
      {
        model: AttractionTariffModel,
        as: "tariffs",
        required: false,
        where: {
          status: AttractionTariffStatusTypes.ACTIVE,
        },
      },
    ],
    order: [
      [
        { model: AttractionOperatorModel, as: "attraction_operator" },
        "id",
        "ASC",
      ],
      [
        { model: AttractionTariffModel, as: "tariffs" },
        "sort_order",
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

  const tariffs = attractionIDs.length
    ? await AttractionTariffModel.findAll({
        where: {
          attraction: {
            [Op.in]: attractionIDs,
          },
          status: AttractionTariffStatusTypes.ACTIVE,
        },
        order: [
          ["attraction", "ASC"],
          ["sort_order", "ASC"],
          ["id", "ASC"],
        ],
      })
    : [];

  const tariffsData = tariffs.map((tariff) => tariff.get({ plain: true }));

  const attractionsWithOperators = attractionsData.map((attraction) => {
    const attractionOperators = operatorsData.filter(
      (operator) => Number(operator.attraction) === Number(attraction.id),
    );

    return AttractionWithOperatorsDTO({
      ...attraction,
      attraction_operator: attractionOperators,
      tariffs: tariffsData.filter(
        (tariff) => Number(tariff.attraction) === Number(attraction.id),
      ),
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
  if (body.price === undefined) {
    throw BadRequest("Attraction price is required!");
  }

  const hasSinglePrice = body.price !== null && body.price !== undefined;
  const hasTariffs = Array.isArray(body.tariffs) && body.tariffs.length > 0;

  if (hasSinglePrice === hasTariffs) {
    throw BadRequest(
      "Provide either a single attraction price or tariffs with price set to null!",
    );
  }

  if (hasSinglePrice) {
    const price = Number(body.price);

    if (!Number.isSafeInteger(price) || price < 0) {
      throw BadRequest("Attraction price is invalid!");
    }
  } else {
    NormalizeAttractionTariffs(body.tariffs!);
  }

  const size = NormalizeAttractionSize(body.size);

  return sequelize.transaction(async (transaction) => {
    const findAttraction = await AttractionModel.findOne({
      where: {
        name: body.name,
      },
      transaction,
    });

    if (findAttraction !== null) {
      throw Conflict("Attraction already exists at this name");
    }

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
        transaction,
      });

      if (filesCount !== uniqueFileIds.length) {
        throw NotFound("One or more files not found!");
      }
    }

    const attraction = await AttractionModel.create(
      {
        name: body.name,
        manufacturer: body.manufacturer,
        status: AttractionStatusTypes.INACTIVE,
        dashboard_file: body.dashboard_file ?? null,
        main_file: body.main_file ?? null,
        files: body.files ?? null,
        sub_attraction_files: body.sub_attraction_files ?? null,
        size,
        price: hasSinglePrice ? Number(body.price) : null,
        duration: body.duration,
        seats: body.seats,
        age_limit: body.age_limit,
        min_height: body.min_height,
        max_weight: body.max_weight,
        description: body.description,
        latitude: body.latitude,
        longitude: body.longitude,
      },
      { transaction },
    );

    const tariffs = hasTariffs
      ? await CreateAttractionTariffsService(
          Number(attraction.id),
          body.tariffs!,
          transaction,
        )
      : [];

    return AttractionDTO({
      ...(attraction.get({ plain: true }) as AttractionModelI),
      tariffs: tariffs.map((tariff) => tariff.get({ plain: true })),
    });
  });
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
        transaction,
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
    const priceWasProvided = body.price !== undefined;
    const tariffsWereProvided = body.tariffs !== undefined;
    const size =
      body.size !== undefined ? NormalizeAttractionSize(body.size) : undefined;
    let activeTariffs: AttractionTariffModel[] = [];

    if (body.price !== undefined && body.price !== null) {
      const price = Number(body.price);

      if (!Number.isSafeInteger(price) || price < 0) {
        throw BadRequest("Attraction price is invalid!");
      }

      if (tariffsWereProvided) {
        throw BadRequest(
          "A single-price attraction cannot contain attraction tariffs!",
        );
      }

      await DeactivateAttractionTariffsService(attractionID, transaction);
    } else if (body.price === null) {
      if (!tariffsWereProvided) {
        if (attraction.price !== null) {
          throw BadRequest(
            "Attraction tariffs are required when price is null!",
          );
        }
      } else {
        activeTariffs = await SyncAttractionTariffsService(
          attractionID,
          body.tariffs!,
          transaction,
        );
      }
    } else if (tariffsWereProvided) {
      if (attraction.price !== null) {
        throw BadRequest(
          "Set attraction price to null before providing tariffs!",
        );
      }

      activeTariffs = await SyncAttractionTariffsService(
        attractionID,
        body.tariffs!,
        transaction,
      );
    }

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

        ...(size !== undefined && {
          size,
        }),

        ...(priceWasProvided && {
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
        ...(body.latitude !== undefined && {
          latitude: body.latitude,
        }),
        ...(body.longitude !== undefined && {
          longitude: body.longitude,
        }),
      },
      {
        transaction,
      },
    );

    if (attraction.price === null && activeTariffs.length === 0) {
      activeTariffs = await AttractionTariffModel.findAll({
        where: {
          attraction: attractionID,
          status: AttractionTariffStatusTypes.ACTIVE,
        },
        order: [
          ["sort_order", "ASC"],
          ["id", "ASC"],
        ],
        transaction,
      });
    }

    return AttractionDTO({
      ...(attraction.get({ plain: true }) as AttractionModelI),
      tariffs: activeTariffs.map((tariff) => tariff.get({ plain: true })),
    });
  });
};

export const DeleteAttractionsService = async (body: DeleteAttractionsData) => {
  const transaction = await sequelize.transaction();

  try {
    const attractionIDs = [...new Set(body.attractionIDs)];

    const attractions = await AttractionModel.findAll({
      where: {
        id: {
          [Op.in]: attractionIDs,
        },
      },
      attributes: ["id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (attractions.length !== attractionIDs.length) {
      throw NotFound("Attraction not found");
    }

    // Soft-deleted rows remain in the table, so release the unique device ID
    // before archiving the attractions. This lets the device be reassigned.
    await AttractionModel.update(
      { device: null },
      {
        where: {
          id: {
            [Op.in]: attractionIDs,
          },
        },
        transaction,
      },
    );

    await AttractionModel.destroy({
      where: {
        id: {
          [Op.in]: attractionIDs,
        },
      },
      transaction,
    });

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
