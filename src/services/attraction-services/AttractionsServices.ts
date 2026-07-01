import { Op } from "sequelize";
import {
  AttractionDTO,
  AttractionWithOperatorsDTO,
} from "../../dtos/attractions-dtos/AttractionDto";
import { Conflict, NotFound } from "../../exceptions";
import { AttractionStatusTypes } from "../../models/postgresql/attraction-model/enums";
import {
  AttractionModel,
  AttractionOperatorModel,
  CategoryModel,
  EmployeeModel,
  FileModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { AttractionOperatorStatusTypes } from "../../models/postgresql/attraction-operator-model/enums";

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

  if (query.categories) {
    where.category = Array.isArray(query.categories)
      ? { [Op.in]: query.categories }
      : query.categories;
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

  const category = await CategoryModel.findByPk(body.category);

  if (category === null) {
    throw NotFound("Category not found");
  }

  const fileIds = [
    body.dashboard_file,
    body.main_file,
    ...(body.files ?? []),
  ].filter((id): id is number => typeof id === "number");

  if (fileIds.length > 0) {
    const filesCount = await FileModel.count({
      where: {
        id: fileIds,
      },
    });

    if (filesCount !== new Set(fileIds).size) {
      throw NotFound("One or more files not found");
    }
  }

  const attraction = await AttractionModel.create({
    name: body.name,
    manufacturer: body.manufacturer,
    category: body.category,
    status: AttractionStatusTypes.INACTIVE,
    dashboard_file: body.dashboard_file ?? null,
    main_file: body.main_file ?? null,
    files: body.files ?? null,
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
  const attraction = await AttractionModel.findByPk(params.attractionID);

  if (attraction == null) throw NotFound("Attraction not found");

  if (body.name !== undefined && body.name !== attraction.name) {
    const findAttraction = await AttractionModel.findOne({
      where: {
        name: body.name,
      },
    });

    if (findAttraction !== null) {
      throw Conflict("Attraction already exists at this name");
    }
  }

  if (body.category !== undefined) {
    const category = await CategoryModel.findByPk(body.category);

    if (category === null) {
      throw NotFound("Category not found");
    }
  }

  const fileIds = [
    body.dashboard_file,
    body.main_file,
    ...(body.files ?? []),
  ].filter((id): id is number => typeof id === "number");

  if (fileIds.length > 0) {
    const filesCount = await FileModel.count({
      where: {
        id: [...new Set(fileIds)],
      },
    });

    if (filesCount !== new Set(fileIds).size) {
      throw NotFound("One or more files not found");
    }
  }

  await attraction.update({
    device: body.device,
    name: body.name,
    manufacturer: body.manufacturer,
    category: body.category,
    status: body.status,
    dashboard_file: body.dashboard_file,
    main_file: body.main_file,
    files: body.files,
    price: body.price,
    duration: body.duration,
    seats: body.seats,
    age_limit: body.age_limit,
    min_height: body.min_height,
    max_weight: body.max_weight,
    description: body.description,
  });

  const attractionData = attraction.get();

  return AttractionDTO(attractionData);
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
