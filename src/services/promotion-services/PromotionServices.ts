import { literal, Op, Transaction, WhereOptions } from "sequelize";
import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";
import { BadRequest, InternalServerError, NotFound } from "../../exceptions";
import {
  PromotionStatusTypes,
  PromotionTypes,
} from "../../models/postgresql/promotion-model/enums";
import {
  getOneTimeCurrentSchedule,
  isPromotionLifecycleChanged,
  normalizePromotionTime,
  normalizePromotionWeekdays,
  preparePromotionSchedule,
  resolvePromotionStatus,
  tashkentDateTimeToUTC,
  validatePromotionDate,
} from "../../utils/promotionDateHelper";
import { FileModel } from "../../models/postgresql/file-model/FileModel";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { PromotionAttractionModel } from "../../models/postgresql/promotion-attraction-model/PromotionAttractionModel";
import { PromotionDTO } from "../../dtos/promotion-dtos/PromotionDto";
import {
  RefreshPromotionWorkflow,
  StartPromotionWorkflow,
  StopPromotionWorkflow,
} from "../../temporal/helpers/promotion.helper";
import { getTashkentDateOnly } from "../../utils/date";
import { AttractionTariffModel } from "../../models/postgresql/attraction-tariff-model/AttractionTariffModel";
import { AttractionTariffStatusTypes } from "../../models/postgresql/attraction-tariff-model/enums";

const ActiveAttractionTariffsInclude = () => ({
  model: AttractionTariffModel,
  as: "tariffs",
  required: false,
  where: { status: AttractionTariffStatusTypes.ACTIVE },
});

export const FindBestActivePromotionsForAttractionsService = async (
  attractionIDs: number[],
  transaction?: Transaction,
): Promise<Map<number, ActivePromotionForAttractionDTO>> => {
  const parsedAttractionIDs = [
    ...new Set(attractionIDs.map((attractionID) => Number(attractionID))),
  ];

  if (
    parsedAttractionIDs.some(
      (attractionID) =>
        !Number.isInteger(attractionID) || attractionID <= 0,
    )
  ) {
    throw BadRequest("ATTRACTION_ID_IS_INVALID");
  }

  const activePromotions = new Map<
    number,
    ActivePromotionForAttractionDTO
  >();

  if (parsedAttractionIDs.length === 0) {
    return activePromotions;
  }

  const now = new Date();

  const promotions = await PromotionModel.findAll({
    where: {
      status: {
        [Op.in]: [PromotionStatusTypes.PLANNED, PromotionStatusTypes.ACTIVE],
      },
    },

    include: [
      {
        model: PromotionAttractionModel,
        as: "promotion_attractions",
        required: true,

        where: {
          attraction: {
            [Op.in]: parsedAttractionIDs,
          },
        },

        attributes: ["id", "attraction", "original_price", "discounted_price"],
      },
    ],

    order: [
      ["discount_percent", "DESC"],
      ["id", "DESC"],
    ],

    transaction,
  });

  for (const promotion of promotions) {
    const status = resolvePromotionStatus(
      {
        type: promotion.type,

        starts_at: promotion.starts_at,
        ends_at: promotion.ends_at,

        start_date: promotion.start_date,
        end_date: promotion.end_date,

        start_time: promotion.start_time,
        end_time: promotion.end_time,

        weekdays: promotion.weekdays,
      },
      now,
    );

    if (status !== PromotionStatusTypes.ACTIVE) {
      continue;
    }

    let promotionStartedAt: Date;
    let promotionEndedAt: Date;

    if (promotion.type === PromotionTypes.ONE_TIME) {
      if (!promotion.starts_at || !promotion.ends_at) {
        continue;
      }

      promotionStartedAt = new Date(promotion.starts_at);

      promotionEndedAt = new Date(promotion.ends_at);

      if (
        Number.isNaN(promotionStartedAt.getTime()) ||
        Number.isNaN(promotionEndedAt.getTime())
      ) {
        continue;
      }
    } else if (promotion.type === PromotionTypes.REGULAR) {
      if (!promotion.start_time || !promotion.end_time) {
        continue;
      }

      const currentDate = getTashkentDateOnly(now);

      promotionStartedAt = tashkentDateTimeToUTC(
        currentDate,
        promotion.start_time,
      );

      promotionEndedAt = tashkentDateTimeToUTC(currentDate, promotion.end_time);

      if (promotionStartedAt >= promotionEndedAt) {
        continue;
      }
    } else {
      continue;
    }

    /*
     * Qo‘shimcha safety check.
     * Promotion aynan hozir active session ichida
     * ekanini tekshiradi.
     */
    if (now < promotionStartedAt || now >= promotionEndedAt) {
      continue;
    }

    const discountPercent = Number(promotion.discount_percent);

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      continue;
    }

    for (const relation of promotion.promotion_attractions ?? []) {
      const relationAttractionID = Number(relation.attraction);

      /*
       * Promotions discount_percent DESC va id DESC tartibida keladi.
       * Shu attraction uchun birinchi valid promotion eng yaxshisi bo‘ladi.
       */
      if (activePromotions.has(relationAttractionID)) {
        continue;
      }

      const originalPrice = Number(relation.original_price);
      const discountedPrice = Number(relation.discounted_price);

      if (!Number.isFinite(originalPrice) || originalPrice < 0) {
        continue;
      }

      if (
        !Number.isFinite(discountedPrice) ||
        discountedPrice < 0 ||
        discountedPrice > originalPrice
      ) {
        continue;
      }

      activePromotions.set(relationAttractionID, {
        id: Number(promotion.id),

        code: promotion.code,
        name: promotion.name,

        type: promotion.type,

        discount_percent: discountPercent,

        original_price: originalPrice,

        discounted_price: discountedPrice,

        promotion_started_at: promotionStartedAt,

        promotion_ended_at: promotionEndedAt,
      });
    }
  }

  return activePromotions;
};

export const FindBestActivePromotionForAttractionService = async (
  attractionID: number,
  transaction?: Transaction,
): Promise<ActivePromotionForAttractionDTO | null> => {
  const parsedAttractionID = Number(attractionID);

  if (!Number.isInteger(parsedAttractionID) || parsedAttractionID <= 0) {
    throw BadRequest("ATTRACTION_ID_IS_INVALID");
  }

  const activePromotions =
    await FindBestActivePromotionsForAttractionsService(
      [parsedAttractionID],
      transaction,
    );

  return activePromotions.get(parsedAttractionID) ?? null;
};

export const GetAllPromotionsService = async (query: GetPromotionsQuery) => {
  const where: WhereOptions = {};

  if (query.status !== undefined) {
    if (!Object.values(PromotionStatusTypes).includes(query.status)) {
      throw BadRequest("PROMOTION_STATUS_IS_INVALID");
    }

    where.status = query.status;
  }

  const { rows, count } = await PromotionModel.findAndCountAll({
    where,
    include: [
      {
        model: PromotionAttractionModel,
        as: "promotion_attractions",
        required: false,
        include: [
          {
            model: AttractionModel,
            as: "attractions",
            required: false,
            include: [ActiveAttractionTariffsInclude()],
          },
        ],
      },
      {
        model: FileModel,
        as: "files",
        required: false,
      },
    ],
    /*
     * hasMany relation sabab count ko‘payib
     * ketmasligi uchun.
     */
    distinct: true,
    order: [
      ["createdAt", "DESC"],
      [
        {
          model: PromotionAttractionModel,
          as: "promotion_attractions",
        },
        "sort_order",
        "ASC",
      ],
    ],
  });

  const promotions = rows.map((promotion) => PromotionDTO(promotion));
  return promotions;
};

export const GetPromotionService = async (params: PromotionParams) => {
  const promotionID = Number(params.promotionID);

  if (!Number.isInteger(promotionID) || promotionID <= 0) {
    throw BadRequest("PROMOTION_ID_IS_INVALID");
  }

  const promotion = await PromotionModel.findByPk(promotionID, {
    include: [
      {
        model: PromotionAttractionModel,
        as: "promotion_attractions",
        required: false,
        include: [
          {
            model: AttractionModel,
            as: "attractions",
            required: false,
            include: [ActiveAttractionTariffsInclude()],
          },
        ],
      },
      {
        model: FileModel,
        as: "files",
        required: false,
      },
    ],

    order: [
      [
        {
          model: PromotionAttractionModel,
          as: "promotion_attractions",
        },
        "sort_order",
        "ASC",
      ],
    ],
  });

  if (!promotion) {
    throw NotFound("PROMOTION_NOT_FOUND");
  }

  return PromotionDTO(promotion);
};

export const CreatePromotionService = async (body: CreatePromotionData) => {
  const discountPercent = Number(body.discount_percent);

  if (
    !Number.isFinite(discountPercent) ||
    discountPercent <= 0 ||
    discountPercent > 100
  ) {
    throw BadRequest("PROMOTION_DISCOUNT_PERCENT_IS_INVALID");
  }

  if (!Array.isArray(body.attractions) || !body.attractions.length) {
    throw BadRequest("PROMOTION_ATTRACTIONS_ARE_REQUIRED");
  }

  const attractionIDs = [...new Set(body.attractions.map((id) => Number(id)))];

  const invalidAttractionID = attractionIDs.some(
    (id) => !Number.isInteger(id) || id <= 0,
  );

  if (invalidAttractionID) {
    throw BadRequest("PROMOTION_ATTRACTION_ID_IS_INVALID");
  }

  const startTime = normalizePromotionTime(body.start_time, "start_time");
  const endTime = normalizePromotionTime(body.end_time, "end_time");

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  let oneTimeStartDate: string | null = null;
  let oneTimeEndDate: string | null = null;
  let oneTimeStartTime: string | null = null;
  let oneTimeEndTime: string | null = null;
  let regularStartTime: string | null = null;
  let regularEndTime: string | null = null;
  let weekdays: number[] | null = null;

  if (body.type === PromotionTypes.ONE_TIME) {
    if (!body.start_date) {
      throw BadRequest("PROMOTION_START_DATE_IS_REQUIRED");
    }

    if (!body.end_date) {
      throw BadRequest("PROMOTION_END_DATE_IS_REQUIRED");
    }

    const startDate = validatePromotionDate(body.start_date, "start_date");
    const endDate = validatePromotionDate(body.end_date, "end_date");

    oneTimeStartDate = startDate;
    oneTimeEndDate = endDate;
    oneTimeStartTime = startTime;
    oneTimeEndTime = endTime;

    startsAt = tashkentDateTimeToUTC(startDate, startTime);
    endsAt = tashkentDateTimeToUTC(endDate, endTime);

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw BadRequest("PROMOTION_END_MUST_BE_AFTER_START");
    }

    if (endsAt.getTime() <= Date.now()) {
      throw BadRequest("PROMOTION_END_TIME_MUST_BE_IN_THE_FUTURE");
    }
  }

  if (body.type === PromotionTypes.REGULAR) {
    if (startTime >= endTime) {
      throw BadRequest("PROMOTION_END_TIME_MUST_BE_AFTER_START_TIME");
    }

    regularStartTime = startTime;
    regularEndTime = endTime;

    weekdays = normalizePromotionWeekdays(body.weekdays);
  }

  const result = await PromotionModel.sequelize!.transaction(
    async (transaction) => {
      let fileID: number | null = null;

      if (body.file !== undefined && body.file !== null) {
        fileID = Number(body.file);

        const file = await FileModel.findByPk(fileID, {
          attributes: ["id"],
          transaction,
        });

        if (!file) {
          throw NotFound("PROMOTION_COVER_FILE_NOT_FOUND");
        }
      }

      const attractions = await AttractionModel.findAll({
        where: {
          id: { [Op.in]: attractionIDs },
        },
        attributes: ["id", "price"],
        transaction,
      });

      if (attractions.length !== attractionIDs.length) {
        const foundIDs = new Set(attractions.map((item) => Number(item.id)));
        const missingIDs = attractionIDs.filter((id) => !foundIDs.has(id));
        throw NotFound(`ATTRACTIONS_NOT_FOUND: ${missingIDs.join(",")}`);
      }

      const promotion = await PromotionModel.create(
        {
          code: body.code,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          type: body.type,
          status: resolvePromotionStatus({
            type: body.type,
            starts_at: startsAt,
            ends_at: endsAt,
            start_date: oneTimeStartDate,
            end_date: oneTimeEndDate,
            start_time: oneTimeStartTime ?? regularStartTime,
            end_time: oneTimeEndTime ?? regularEndTime,
            weekdays,
          }),
          discount_percent: discountPercent,
          starts_at: startsAt,
          ends_at: endsAt,
          start_date: oneTimeStartDate,
          end_date: oneTimeEndDate,
          start_time: oneTimeStartTime ?? regularStartTime,
          end_time: oneTimeEndTime ?? regularEndTime,
          weekdays,
          file: fileID,
        },
        {
          transaction,
        },
      );

      const attractionByID = new Map(
        attractions.map((attraction) => [Number(attraction.id), attraction]),
      );

      const promotionAttractions = attractionIDs.map((attractionID, index) => {
        const attraction = attractionByID.get(attractionID);

        if (!attraction) {
          throw NotFound("ATTRACTION_NOT_FOUND");
        }

        const originalPrice = Number(attraction.price);

        if (!Number.isFinite(originalPrice) || originalPrice < 0) {
          throw BadRequest(`ATTRACTION_${attractionID}_PRICE_IS_INVALID`);
        }

        const discountedPrice = Math.round(
          originalPrice * ((100 - discountPercent) / 100),
        );

        return {
          promotion: Number(promotion.id),
          attraction: attractionID,
          original_price: originalPrice,
          discounted_price: discountedPrice,
          sort_order: index,
        };
      });

      await PromotionAttractionModel.bulkCreate(promotionAttractions, {
        transaction,
      });

      const createdPromotion = await PromotionModel.findByPk(promotion.id, {
        include: [
          {
            model: PromotionAttractionModel,
            as: "promotion_attractions",
            required: false,
            include: [
              {
                model: AttractionModel,
                as: "attractions",
                required: true,
                include: [ActiveAttractionTariffsInclude()],
              },
            ],
          },
        ],

        transaction,
      });

      if (!createdPromotion) {
        throw NotFound("CREATED_PROMOTION_NOT_FOUND");
      }

      return {
        id: Number(promotion.id),
        data: PromotionDTO(createdPromotion),
      };
    },
  );

  /*
   * DB commit bo‘lgandan keyin Temporal.
   */
  await StartPromotionWorkflow(result.id);

  return result.data;
};


export const UpdatePromotionService = async (
  params: PromotionParams,
  body: UpdatePromotionData,
) => {
  const promotionID = Number(params.promotionID);

  if (!Number.isInteger(promotionID) || promotionID <= 0) {
    throw BadRequest("PROMOTION_ID_IS_INVALID");
  }

  if (!body || !Object.keys(body).length) {
    throw BadRequest("PROMOTION_UPDATE_DATA_IS_REQUIRED");
  }

  const result = await PromotionModel.sequelize!.transaction(
    async (transaction) => {
      const promotion = await PromotionModel.findByPk(promotionID, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!promotion) {
        throw NotFound("PROMOTION_NOT_FOUND");
      }

      if (promotion.status === PromotionStatusTypes.ARCHIVED) {
        throw BadRequest("ARCHIVED_PROMOTION_CANNOT_BE_UPDATED");
      }

      if (
        body.status !== undefined &&
        body.status !== PromotionStatusTypes.ARCHIVED
      ) {
        throw BadRequest("PROMOTION_STATUS_CAN_ONLY_BE_ARCHIVED");
      }

      const archiveRequested = body.status === PromotionStatusTypes.ARCHIVED;

      /*
       * Name
       */
      const name = body.name !== undefined ? body.name.trim() : promotion.name;

      if (!name) {
        throw BadRequest("PROMOTION_NAME_IS_REQUIRED");
      }

      /*
       * Description
       */
      const description =
        body.description === undefined
          ? promotion.description
          : body.description?.trim() || null;

      /*
       * File
       */
      let file = promotion.file;

      if (body.file !== undefined) {
        if (body.file === null) {
          file = null;
        } else {
          const fileID = Number(body.file);

          if (!Number.isInteger(fileID) || fileID <= 0) {
            throw BadRequest("PROMOTION_FILE_ID_IS_INVALID");
          }

          const existingFile = await FileModel.findByPk(fileID, {
            attributes: ["id"],
            transaction,
          });

          if (!existingFile) {
            throw NotFound("PROMOTION_FILE_NOT_FOUND");
          }

          file = fileID;
        }
      }

      /*
       * Discount
       */
      const discountPercent =
        body.discount_percent !== undefined
          ? Number(body.discount_percent)
          : Number(promotion.discount_percent);

      if (
        !Number.isFinite(discountPercent) ||
        discountPercent <= 0 ||
        discountPercent > 100
      ) {
        throw BadRequest("PROMOTION_DISCOUNT_PERCENT_IS_INVALID");
      }

      /*
       * Type
       */
      const type = body.type ?? promotion.type;

      if (!Object.values(PromotionTypes).includes(type)) {
        throw BadRequest("PROMOTION_TYPE_IS_INVALID");
      }

      /*
       * Regular promotion uchun date ishlatilmaydi.
       */
      if (
        type === PromotionTypes.REGULAR &&
        (body.start_date !== undefined || body.end_date !== undefined)
      ) {
        throw BadRequest("REGULAR_PROMOTION_DATES_ARE_NOT_ALLOWED");
      }

      const currentLifecycle = {
        type: promotion.type,

        starts_at: promotion.starts_at,
        ends_at: promotion.ends_at,

        start_date: promotion.start_date,
        end_date: promotion.end_date,

        start_time: promotion.start_time,
        end_time: promotion.end_time,

        weekdays: promotion.weekdays,
      };

      const schedule = preparePromotionSchedule(currentLifecycle, body, type);

      const lifecycleChanged = isPromotionLifecycleChanged(currentLifecycle, {
        type,
        ...schedule,
      });

      const status = archiveRequested
        ? PromotionStatusTypes.ARCHIVED
        : lifecycleChanged
          ? resolvePromotionStatus({
              type,
              ...schedule,
            })
          : promotion.status;

      /*
       * ONE_TIME promotionni tugagan vaqtga
       * o‘zgartirish mumkin emas.
       */
      if (!archiveRequested && status === PromotionStatusTypes.ARCHIVED) {
        throw BadRequest("PROMOTION_SCHEDULE_MUST_HAVE_A_FUTURE_PERIOD");
      }

      const discountChanged =
        discountPercent !== Number(promotion.discount_percent);

      await promotion.update(
        {
          name,
          description,
          file,

          type,
          status,

          discount_percent: discountPercent,

          ...schedule,
        },
        {
          transaction,
        },
      );

      /*
       * Attractionlar yangilansa relationlar qayta yoziladi.
       */
      if (body.attractions !== undefined) {
        if (!Array.isArray(body.attractions) || !body.attractions.length) {
          throw BadRequest("PROMOTION_ATTRACTIONS_ARE_REQUIRED");
        }

        const attractionIDs = [...new Set(body.attractions.map(Number))];

        const hasInvalidAttractionID = attractionIDs.some(
          (attractionID) =>
            !Number.isInteger(attractionID) || attractionID <= 0,
        );

        if (hasInvalidAttractionID) {
          throw BadRequest("PROMOTION_ATTRACTION_ID_IS_INVALID");
        }

        const attractions = await AttractionModel.findAll({
          where: {
            id: {
              [Op.in]: attractionIDs,
            },
          },

          attributes: ["id", "price"],

          transaction,
        });

        if (attractions.length !== attractionIDs.length) {
          const foundIDs = new Set(
            attractions.map((attraction) => Number(attraction.id)),
          );

          const missingIDs = attractionIDs.filter(
            (attractionID) => !foundIDs.has(attractionID),
          );

          throw NotFound(`ATTRACTIONS_NOT_FOUND: ${missingIDs.join(",")}`);
        }

        const attractionMap = new Map(
          attractions.map((attraction) => [Number(attraction.id), attraction]),
        );

        const promotionAttractions = attractionIDs.map(
          (attractionID, index) => {
            const attraction = attractionMap.get(attractionID)!;
            const originalPrice = Number(attraction.price);

            if (!Number.isFinite(originalPrice) || originalPrice < 0) {
              throw BadRequest(`ATTRACTION_${attractionID}_PRICE_IS_INVALID`);
            }

            return {
              promotion: promotionID,
              attraction: attractionID,

              original_price: originalPrice,

              discounted_price: Math.round(
                originalPrice * ((100 - discountPercent) / 100),
              ),

              sort_order: index,
            };
          },
        );

        await PromotionAttractionModel.destroy({
          where: {
            promotion: promotionID,
          },

          force: true,
          transaction,
        });

        await PromotionAttractionModel.bulkCreate(promotionAttractions, {
          transaction,
        });
      } else if (discountChanged) {
        /*
         * Faqat discount o‘zgarsa relationlarni
         * o‘chirib qayta yaratmaymiz.
         */
        const [updatedRelationsCount] = await PromotionAttractionModel.update(
          {
            discounted_price: literal(
              `CAST(ROUND("original_price" * ${
                (100 - discountPercent) / 100
              }) AS BIGINT)`,
            ),
          },
          {
            where: {
              promotion: promotionID,
            },

            transaction,
          },
        );

        if (!updatedRelationsCount) {
          throw BadRequest("PROMOTION_ATTRACTIONS_ARE_REQUIRED");
        }
      }

      return {
        archiveRequested,
        lifecycleChanged,
      };
    },
  );

  /*
   * Temporal faqat DB transaction commit bo‘lgandan keyin.
   */
  try {
    if (result.archiveRequested) {
      await StopPromotionWorkflow(promotionID);
    } else if (result.lifecycleChanged) {
      await RefreshPromotionWorkflow(promotionID);
    }
  } catch (error) {
    console.error("Failed to synchronize promotion workflow:", error);

    throw InternalServerError(
      result.archiveRequested
        ? "FAILED_TO_STOP_PROMOTION_WORKFLOW"
        : "FAILED_TO_REFRESH_PROMOTION_WORKFLOW",
    );
  }

  const promotion = await PromotionModel.findByPk(promotionID, {
    include: [
      {
        model: PromotionAttractionModel,
        as: "promotion_attractions",
        required: false,

        include: [
          {
            model: AttractionModel,
            as: "attractions",
            required: true,
            include: [ActiveAttractionTariffsInclude()],
          },
        ],
      },

      {
        model: FileModel,
        as: "files",
        required: false,
      },
    ],

    order: [
      [
        {
          model: PromotionAttractionModel,
          as: "promotion_attractions",
        },
        "sort_order",
        "ASC",
      ],
    ],
  });

  if (!promotion) {
    throw NotFound("PROMOTION_NOT_FOUND");
  }

  return PromotionDTO(promotion);
};


export const DeletePromotionsService = async (body: DeletePromotionsData) => {
  const promotionIDs = [
    ...new Set(body.promotionIDs.map((promotionID) => Number(promotionID))),
  ];

  const deletedCount = await PromotionModel.sequelize!.transaction(
    async (transaction) => {
      /*
       * Barcha promotionlar mavjudligini tekshiramiz.
       */
      const promotions = await PromotionModel.findAll({
        where: {
          id: {
            [Op.in]: promotionIDs,
          },
        },

        attributes: ["id"],

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const existingPromotionIDs = new Set(
        promotions.map((promotion) => Number(promotion.id)),
      );

      const missingPromotionIDs = promotionIDs.filter(
        (promotionID) => !existingPromotionIDs.has(promotionID),
      );

      if (missingPromotionIDs.length) {
        throw NotFound(
          `PROMOTIONS_NOT_FOUND: ${missingPromotionIDs.join(",")}`,
        );
      }

      /*
       * Avval relationlarni soft-delete qilamiz.
       */
      await PromotionAttractionModel.destroy({
        where: {
          promotion: {
            [Op.in]: promotionIDs,
          },
        },

        force: true,
        transaction,
      });

      /*
       * Keyin promotionlarni soft-delete qilamiz.
       */
      const affectedRows = await PromotionModel.destroy({
        where: {
          id: {
            [Op.in]: promotionIDs,
          },
        },

        transaction,
      });

      return affectedRows;
    },
  );

  /*
   * DB transaction commit bo‘lgandan keyin
   * Temporal workflowlarni to‘xtatamiz.
   *
   * Bitta workflow xato bersa qolganlari
   * baribir terminate qilinadi.
   */
  const workflowResults = await Promise.allSettled(
    promotionIDs.map((promotionID) => StopPromotionWorkflow(promotionID)),
  );

  workflowResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to stop promotion workflow: ${promotionIDs[index]}`,
        result.reason,
      );
    }
  });

  return true;
};
