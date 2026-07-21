import { randomBytes } from "node:crypto";
import { Op, Transaction } from "sequelize";
import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";
import { BadRequest, NotFound } from "../../exceptions";
import { CreatePromotionBody } from "../../controllers/promotion-controllers/types";
import {
  PromotionStatusTypes,
  PromotionTypes,
} from "../../models/postgresql/promotion-model/enums";
import {
  normalizePromotionTime,
  normalizePromotionWeekdays,
  tashkentDateTimeToUTC,
  validatePromotionDate,
} from "../../utils/promotionDateHelper";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { FileModel } from "../../models/postgresql/file-model/FileModel";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { PromotionAttractionModel } from "../../models/postgresql/promotion-attraction-model/PromotionAttractionModel";
import { PromotionDTO } from "../../dtos/promotion-dtos/PromotionDto";
import { StartPromotionWorkflow } from "../../temporal/helpers/promotion.helper";

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

export const CreatePromotionService = async (body: CreatePromotionBody) => {
  const discountPercent = Number(body.discount_percent);

  if (
    !Number.isFinite(discountPercent) ||
    discountPercent <= 0 ||
    discountPercent > 100
  ) {
    throw BadRequest("PROMOTION_DISCOUNT_PERCENT_IS_INVALID");
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

  return await PromotionModel.sequelize!.transaction(async (transaction) => {
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
        status: PromotionStatusTypes.ACTIVE,

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

    await StartPromotionWorkflow(Number(promotion.id));

    return PromotionDTO(createdPromotion);
  });
};
