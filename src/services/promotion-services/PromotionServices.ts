import { randomBytes } from "node:crypto";
import { Op, Transaction, WhereOptions } from "sequelize";
import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";
import { BadRequest, InternalServerError, NotFound } from "../../exceptions";
import {
  PromotionStatusTypes,
  PromotionTypes,
} from "../../models/postgresql/promotion-model/enums";
import {
  arraysEqual,
  getOneTimeCurrentSchedule,
  isPromotionLifecycleChanged,
  normalizePromotionTime,
  normalizePromotionWeekdays,
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

const generatePromotionCode = () => {
  const random = randomBytes(3).toString("hex").toUpperCase();

  return `PROMO-${random}`;
};

const generateUniquePromotionCode = async (transaction: Transaction) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generatePromotionCode();

    const exists = await PromotionModel.findOne({
      where: {
        code,
      },
      attributes: ["id"],
      transaction,
    });

    if (!exists) {
      return code;
    }
  }

  throw BadRequest("PROMOTION_CODE_GENERATION_FAILED");
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

  if (!Object.values(PromotionTypes).includes(body.type)) {
    throw BadRequest("PROMOTION_TYPE_IS_INVALID");
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

  const startDate = validatePromotionDate(body.start_date, "start_date");

  const endDate = validatePromotionDate(body.end_date, "end_date");

  const startTime = normalizePromotionTime(body.start_time, "start_time");

  const endTime = normalizePromotionTime(body.end_time, "end_time");

  if (startDate > endDate) {
    throw BadRequest("PROMOTION_END_DATE_MUST_BE_AFTER_START_DATE");
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;

  let regularStartDate: string | null = null;
  let regularEndDate: string | null = null;

  let regularStartTime: string | null = null;
  let regularEndTime: string | null = null;

  let weekdays: number[] | null = null;

  if (body.type === PromotionTypes.ONE_TIME) {
    startsAt = tashkentDateTimeToUTC(startDate, startTime);

    endsAt = tashkentDateTimeToUTC(endDate, endTime);

    if (startsAt >= endsAt) {
      throw BadRequest("PROMOTION_END_TIME_MUST_BE_AFTER_START_TIME");
    }
  }

  if (body.type === PromotionTypes.REGULAR) {
    if (startTime >= endTime) {
      throw BadRequest("REGULAR_PROMOTION_OVERNIGHT_IS_NOT_SUPPORTED");
    }

    regularStartDate = startDate;
    regularEndDate = endDate;

    regularStartTime = startTime;
    regularEndTime = endTime;

    weekdays = normalizePromotionWeekdays(body.weekdays);
  }

  const result = await PromotionModel.sequelize!.transaction(
    async (transaction) => {
      if (body.file) {
        const cover = await FileModel.findByPk(Number(body.file), {
          transaction,
        });

        if (!cover) {
          throw NotFound("PROMOTION_COVER_FILE_NOT_FOUND");
        }
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
        const foundIDs = new Set(attractions.map((item) => Number(item.id)));

        const missingIDs = attractionIDs.filter((id) => !foundIDs.has(id));

        throw NotFound(`ATTRACTIONS_NOT_FOUND: ${missingIDs.join(",")}`);
      }

      const code = await generateUniquePromotionCode(transaction);

      const promotion = await PromotionModel.create(
        {
          code,
          name: body.name.trim(),
          description: body.description?.trim() || null,

          type: body.type,
          status: resolvePromotionStatus({
            type: body.type,
            starts_at: startsAt,
            ends_at: endsAt,
            start_date: regularStartDate,
            end_date: regularEndDate,
            start_time: regularStartTime,
            end_time: regularEndTime,
            weekdays,
          }),

          discount_percent: discountPercent,

          starts_at: startsAt,
          ends_at: endsAt,

          start_date: regularStartDate,
          end_date: regularEndDate,

          start_time: regularStartTime,
          end_time: regularEndTime,

          weekdays,

          file: body.file ? Number(body.file) : null,
        },
        {
          transaction,
        },
      );

      const attractionByID = new Map(
        attractions.map((attraction) => [Number(attraction.id), attraction]),
      );

      const promotionAttractions = attractionIDs.map((attractionID, index) => {
        const attraction = attractionByID.get(attractionID)!;

        const originalPrice = Number(attraction.price);

        const discountedPrice = Math.round(
          originalPrice * ((100 - discountPercent) / 100),
        );

        if (!Number.isFinite(originalPrice) || originalPrice < 0) {
          throw BadRequest(`ATTRACTION_${attractionID}_PRICE_IS_INVALID`);
        }

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

  // Не удерживаем DB-транзакцию во время сетевого вызова к Temporal.
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

  if (!body || typeof body !== "object" || !Object.keys(body).length) {
    throw BadRequest("PROMOTION_UPDATE_DATA_IS_REQUIRED");
  }

  const result = await PromotionModel.sequelize!.transaction(
    async (transaction) => {
      /*
       * Promotionni lock bilan olamiz.
       * Bir vaqtning o‘zida ikkita update ishlamasligi uchun.
       */
      const promotion = await PromotionModel.findByPk(promotionID, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!promotion) {
        throw NotFound("PROMOTION_NOT_FOUND");
      }

      /*
       * Arxiv promotion qayta tahrirlanmaydi.
       */
      if (promotion.status === PromotionStatusTypes.ARCHIVED) {
        throw BadRequest("ARCHIVED_PROMOTION_CANNOT_BE_UPDATED");
      }

      /*
       * Hozirgi attraction relationlarni saqlab olamiz.
       * Temporal xato bo‘lsa rollback qilish uchun kerak.
       */
      const currentRelations = await PromotionAttractionModel.findAll({
        where: {
          promotion: promotionID,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      interface PreviousPromotionAttraction {
        attraction: number;
        original_price: number;
        discounted_price: number;
        sort_order: number;
      }

      const previousRelations: PreviousPromotionAttraction[] =
        currentRelations.map((relation) => ({
          attraction: Number(relation.attraction),
          original_price: Number(relation.original_price),
          discounted_price: Number(relation.discounted_price),
          sort_order: Number(relation.sort_order),
        }));

      /*
       * Promotionning eski holati.
       * Temporal sync xato bo‘lsa tiklanadi.
       */
      const previousData: {
        name: string;
        description: string | null;
        type: PromotionTypes;
        status: PromotionStatusTypes;
        discount_percent: number;
        starts_at: Date | null;
        ends_at: Date | null;
        start_date: string | null;
        end_date: string | null;
        start_time: string | null;
        end_time: string | null;
        weekdays: number[] | null;
        file: number | null;
      } = {
        name: promotion.name,
        description: promotion.description,

        type: promotion.type,
        status: promotion.status,

        discount_percent: Number(promotion.discount_percent),

        starts_at: promotion.starts_at ? new Date(promotion.starts_at) : null,

        ends_at: promotion.ends_at ? new Date(promotion.ends_at) : null,

        start_date: promotion.start_date,
        end_date: promotion.end_date,

        start_time: promotion.start_time,
        end_time: promotion.end_time,

        weekdays: promotion.weekdays ? [...promotion.weekdays] : null,

        file: promotion.file,
      };

      /*
       * NAME
       */
      let name = promotion.name;

      if (body.name !== undefined) {
        if (typeof body.name !== "string") {
          throw BadRequest("PROMOTION_NAME_IS_INVALID");
        }

        const parsedName = body.name.trim();

        if (!parsedName) {
          throw BadRequest("PROMOTION_NAME_IS_REQUIRED");
        }

        name = parsedName;
      }

      /*
       * DESCRIPTION
       *
       * undefined → eski qiymat
       * null      → olib tashlanadi
       * string    → yangi qiymat
       */
      let description = promotion.description;

      if (body.description !== undefined) {
        if (body.description === null) {
          description = null;
        } else {
          if (typeof body.description !== "string") {
            throw BadRequest("PROMOTION_DESCRIPTION_IS_INVALID");
          }

          description = body.description.trim() || null;
        }
      }

      /*
       * COVER FILE
       *
       * undefined → eski file
       * null      → olib tashlash
       * number    → yangi file
       */
      let file = promotion.file;

      if (body.file !== undefined) {
        if (body.file === null) {
          file = null;
        } else {
          const parsedFileID = Number(body.file);

          if (!Number.isInteger(parsedFileID) || parsedFileID <= 0) {
            throw BadRequest("PROMOTION_COVER_FILE_IS_INVALID");
          }

          const files = await FileModel.findByPk(parsedFileID, {
            attributes: ["id"],
            transaction,
          });

          if (!files) {
            throw NotFound("PROMOTION_FILE_NOT_FOUND");
          }

          file = parsedFileID;
        }
      }

      /*
       * DISCOUNT
       */
      let discountPercent = Number(promotion.discount_percent);

      if (body.discount_percent !== undefined) {
        const parsedDiscount = Number(body.discount_percent);

        if (
          !Number.isFinite(parsedDiscount) ||
          parsedDiscount <= 0 ||
          parsedDiscount > 100
        ) {
          throw BadRequest("PROMOTION_DISCOUNT_PERCENT_IS_INVALID");
        }

        discountPercent = parsedDiscount;
      }

      /*
       * STATUS
       *
       * Frontend faqat archived yuborishi mumkin.
       * planned va active Temporal orqali boshqariladi.
       */
      if (
        body.status !== undefined &&
        body.status !== PromotionStatusTypes.ARCHIVED
      ) {
        throw BadRequest("PROMOTION_STATUS_CAN_ONLY_BE_ARCHIVED");
      }

      const archiveRequested = body.status === PromotionStatusTypes.ARCHIVED;

      /*
       * TYPE
       */
      const type = body.type ?? promotion.type;

      if (!Object.values(PromotionTypes).includes(type)) {
        throw BadRequest("PROMOTION_TYPE_IS_INVALID");
      }

      /*
       * Final lifecycle qiymatlari.
       *
       * ONE_TIME:
       * starts_at / ends_at ishlaydi.
       *
       * REGULAR:
       * start_date / end_date
       * start_time / end_time / weekdays ishlaydi.
       */
      let startsAt: Date | null = null;
      let endsAt: Date | null = null;

      let startDate: string | null = null;
      let endDate: string | null = null;

      let startTime: string | null = null;
      let endTime: string | null = null;

      let weekdays: number[] | null = null;

      /*
       * ONE TIME SCHEDULE
       */
      if (type === PromotionTypes.ONE_TIME) {
        const previousOneTimeSchedule =
          promotion.type === PromotionTypes.ONE_TIME
            ? getOneTimeCurrentSchedule(promotion)
            : {
                startDate: null,
                startTime: null,
                endDate: null,
                endTime: null,
              };

        const finalStartDate =
          body.start_date ?? previousOneTimeSchedule.startDate;

        const finalEndDate = body.end_date ?? previousOneTimeSchedule.endDate;

        const finalStartTime =
          body.start_time ?? previousOneTimeSchedule.startTime;

        const finalEndTime = body.end_time ?? previousOneTimeSchedule.endTime;

        if (
          !finalStartDate ||
          !finalEndDate ||
          !finalStartTime ||
          !finalEndTime
        ) {
          throw BadRequest("ONE_TIME_PROMOTION_SCHEDULE_IS_REQUIRED");
        }

        const validStartDate = validatePromotionDate(
          finalStartDate,
          "start_date",
        );

        const validEndDate = validatePromotionDate(finalEndDate, "end_date");

        startsAt = tashkentDateTimeToUTC(validStartDate, finalStartTime);

        endsAt = tashkentDateTimeToUTC(validEndDate, finalEndTime);

        if (endsAt.getTime() <= startsAt.getTime()) {
          throw BadRequest("PROMOTION_END_MUST_BE_AFTER_START");
        }

        /*
         * ONE_TIME bo‘lganda REGULAR fieldlar
         * null qilinadi.
         */
        startDate = null;
        endDate = null;

        startTime = null;
        endTime = null;

        weekdays = null;
      }

      /*
       * REGULAR SCHEDULE
       */
      if (type === PromotionTypes.REGULAR) {
        const finalStartDate =
          body.start_date ??
          (promotion.type === PromotionTypes.REGULAR
            ? promotion.start_date
            : null);

        const finalEndDate =
          body.end_date ??
          (promotion.type === PromotionTypes.REGULAR
            ? promotion.end_date
            : null);

        const finalStartTime =
          body.start_time ??
          (promotion.type === PromotionTypes.REGULAR
            ? promotion.start_time
            : null);

        const finalEndTime =
          body.end_time ??
          (promotion.type === PromotionTypes.REGULAR
            ? promotion.end_time
            : null);

        if (
          !finalStartDate ||
          !finalEndDate ||
          !finalStartTime ||
          !finalEndTime
        ) {
          throw BadRequest("REGULAR_PROMOTION_SCHEDULE_IS_REQUIRED");
        }

        startDate = validatePromotionDate(finalStartDate, "start_date");

        endDate = validatePromotionDate(finalEndDate, "end_date");

        startTime = normalizePromotionTime(finalStartTime, "start_time");

        endTime = normalizePromotionTime(finalEndTime, "end_time");

        if (startDate > endDate) {
          throw BadRequest("PROMOTION_END_DATE_MUST_BE_AFTER_START_DATE");
        }

        /*
         * Hozircha overnight aksiya:
         * masalan 22:00–02:00 qo‘llab-quvvatlanmaydi.
         */
        if (startTime >= endTime) {
          throw BadRequest("OVERNIGHT_PROMOTION_IS_NOT_SUPPORTED");
        }

        if (body.weekdays !== undefined) {
          weekdays = normalizePromotionWeekdays(body.weekdays);
        } else if (
          promotion.type === PromotionTypes.REGULAR &&
          promotion.weekdays?.length
        ) {
          weekdays = normalizePromotionWeekdays(promotion.weekdays);
        } else {
          weekdays = normalizePromotionWeekdays();
        }

        /*
         * REGULAR bo‘lganda ONE_TIME fieldlar
         * null qilinadi.
         */
        startsAt = null;
        endsAt = null;
      }

      /*
       * Oldingi lifecycle qiymatlarini
       * canonical formatga keltiramiz.
       *
       * weekdays null bo‘lsa REGULAR uchun
       * barcha kunlar deb qaraladi.
       */
      const previousLifecycleWeekdays =
        promotion.type === PromotionTypes.REGULAR
          ? promotion.weekdays?.length
            ? normalizePromotionWeekdays(promotion.weekdays)
            : normalizePromotionWeekdays()
          : null;

      const lifecycleChanged = isPromotionLifecycleChanged(
        {
          type: promotion.type,

          starts_at: promotion.starts_at,
          ends_at: promotion.ends_at,

          start_date: promotion.start_date,

          end_date: promotion.end_date,

          start_time: promotion.start_time,

          end_time: promotion.end_time,

          weekdays: previousLifecycleWeekdays,
        },
        {
          type,

          starts_at: startsAt,
          ends_at: endsAt,

          start_date: startDate,
          end_date: endDate,

          start_time: startTime,
          end_time: endTime,

          weekdays,
        },
      );

      let status: PromotionStatusTypes = promotion.status;

      if (archiveRequested) {
        /*
         * Manual archive.
         */
        status = PromotionStatusTypes.ARCHIVED;
      } else if (lifecycleChanged) {
        /*
         * Schedule o‘zgargan bo‘lsa hozirgi
         * Tashkent vaqtiga qarab status qayta hisoblanadi.
         */
        status = resolvePromotionStatus(
          {
            type,
            starts_at: startsAt,
            ends_at: endsAt,
            start_date: startDate,
            end_date: endDate,
            start_time: startTime,
            end_time: endTime,
            weekdays,
          },
          new Date(),
        );

        /*
         * Tugagan schedule’ga update qilishga
         * ruxsat bermaymiz.
         *
         * Manual archive bundan mustasno.
         */
        if (status === PromotionStatusTypes.ARCHIVED) {
          throw BadRequest("PROMOTION_SCHEDULE_MUST_HAVE_A_FUTURE_PERIOD");
        }
      }

      /*
       * Promotion update.
       */
      await promotion.update(
        {
          name,
          description,
          type,
          status,
          discount_percent: discountPercent,
          starts_at: startsAt,
          ends_at: endsAt,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          weekdays,
          file: file,
        },
        {
          transaction,
        },
      );

      const discountChanged =
        discountPercent !== Number(previousData.discount_percent);

      const attractionsChanged = body.attractions !== undefined;

      /*
       * Attractionlar o‘zgarsa yoki discount o‘zgarsa
       * promotion_attractions qayta hisoblanadi.
       */
      if (attractionsChanged || discountChanged) {
        interface PromotionRelationData {
          attraction: number;
          original_price: number;
          discounted_price: number;
          sort_order: number;
        }

        let relationData: PromotionRelationData[] = [];

        /*
         * Yangi attraction array keldi.
         */
        if (body.attractions !== undefined) {
          if (!Array.isArray(body.attractions) || !body.attractions.length) {
            throw BadRequest("PROMOTION_ATTRACTIONS_ARE_REQUIRED");
          }

          const attractionIDs = [
            ...new Set(body.attractions.map((id) => Number(id))),
          ];

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

            attributes: ["id", "name", "price"],

            transaction,
          });

          if (attractions.length !== attractionIDs.length) {
            const foundAttractionIDs = new Set(
              attractions.map((attraction) => Number(attraction.id)),
            );

            const missingAttractionIDs = attractionIDs.filter(
              (attractionID) => !foundAttractionIDs.has(attractionID),
            );

            throw NotFound(
              `ATTRACTIONS_NOT_FOUND: ${missingAttractionIDs.join(",")}`,
            );
          }

          const attractionMap = new Map(
            attractions.map((attraction) => [
              Number(attraction.id),
              attraction,
            ]),
          );

          relationData = attractionIDs.map((attractionID, index) => {
            const attraction = attractionMap.get(attractionID);

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
              attraction: attractionID,

              original_price: originalPrice,

              discounted_price: discountedPrice,

              sort_order: index,
            };
          });
        } else {
          /*
           * Faqat discount o‘zgargan.
           *
           * Eski original_price snapshot saqlanadi,
           * faqat discounted_price qayta hisoblanadi.
           */
          relationData = previousRelations.map((relation) => ({
            attraction: relation.attraction,

            original_price: relation.original_price,

            discounted_price: Math.round(
              relation.original_price * ((100 - discountPercent) / 100),
            ),

            sort_order: relation.sort_order,
          }));
        }

        if (!relationData.length) {
          throw BadRequest("PROMOTION_ATTRACTIONS_ARE_REQUIRED");
        }

        /*
         * Mapping table uchun hard delete.
         *
         * paranoid soft delete qilsak:
         * unique (promotion, attraction)
         * conflict berishi mumkin.
         */
        await PromotionAttractionModel.destroy({
          where: {
            promotion: promotionID,
          },

          force: true,
          transaction,
        });

        await PromotionAttractionModel.bulkCreate(
          relationData.map((relation) => ({
            promotion: promotionID,
            ...relation,
          })),
          {
            transaction,
          },
        );
      }

      return {
        previousData,
        previousRelations,

        archiveRequested,
        lifecycleChanged,
      };
    },
  );

  /*
   * Temporal DB transaction commit bo‘lgandan
   * keyingina ishlaydi.
   */
  try {
    if (result.archiveRequested) {
      /*
       * Manual archive bo‘lsa workflow to‘xtaydi.
       */
      await StopPromotionWorkflow(promotionID);
    } else if (result.lifecycleChanged) {
      /*
       * Schedule o‘zgarsa workflow DBdagi
       * yangi schedule’ni qayta o‘qiydi.
       */
      await RefreshPromotionWorkflow(promotionID);
    }
  } catch (error) {
    console.error("Failed to synchronize promotion workflow:", error);

    /*
     * Temporal xato bo‘lsa promotion va
     * relationlar oldingi holatga qaytariladi.
     */
    try {
      await PromotionModel.sequelize!.transaction(async (transaction) => {
        await PromotionModel.update(result.previousData, {
          where: {
            id: promotionID,
          },
          transaction,
        });

        await PromotionAttractionModel.destroy({
          where: {
            promotion: promotionID,
          },

          force: true,
          transaction,
        });

        if (result.previousRelations.length) {
          await PromotionAttractionModel.bulkCreate(
            result.previousRelations.map((relation) => ({
              promotion: promotionID,
              ...relation,
            })),
            {
              transaction,
            },
          );
        }
      });
    } catch (rollbackError) {
      console.error("Failed to rollback promotion data:", rollbackError);

      throw InternalServerError("FAILED_TO_ROLLBACK_PROMOTION_UPDATE");
    }

    /*
     * Eski workflow holatini tiklash.
     *
     * RefreshPromotionWorkflow:
     * - workflow mavjud bo‘lsa signal yuboradi;
     * - mavjud bo‘lmasa qayta start qiladi.
     */
    if (result.previousData.status !== PromotionStatusTypes.ARCHIVED) {
      try {
        await RefreshPromotionWorkflow(promotionID);
      } catch (recoveryError) {
        console.error(
          "Failed to restore previous promotion workflow:",
          recoveryError,
        );
      }
    }

    throw InternalServerError("FAILED_TO_UPDATE_PROMOTION_LIFECYCLE");
  }

  /*
   * Yangilangan promotionni to‘liq relationlar
   * bilan qaytaramiz.
   */
  const updatedPromotion = await PromotionModel.findByPk(promotionID, {
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

  if (!updatedPromotion) {
    throw NotFound("PROMOTION_NOT_FOUND");
  }

  return PromotionDTO(updatedPromotion);
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
