import { Op } from "sequelize";
import { PromotionStatusTypes, PromotionTypes } from "../../models/postgresql/promotion-model/enums";
import { PromotionModel } from "../../models/postgresql/promotion-model/PromotionModel";
import { addDaysToDate, getISOWeekday, getTashkentDateOnly } from "../../utils/date";
import { tashkentDateTimeToUTC } from "../../utils/promotionDateHelper";
import { PromotionLifecycleState, PromotionTemporalStatus } from "../types/promotion.types";

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const resolveOneTimePromotion = (
  promotion: PromotionModel,
  now: Date,
): PromotionLifecycleState => {
  if (!promotion.starts_at || !promotion.ends_at) {
    throw new Error(`PROMOTION_${promotion.id}_ONE_TIME_SCHEDULE_INVALID`);
  }

  const startsAt = new Date(promotion.starts_at);
  const endsAt = new Date(promotion.ends_at);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    startsAt >= endsAt
  ) {
    throw new Error(`PROMOTION_${promotion.id}_ONE_TIME_SCHEDULE_INVALID`);
  }

  if (now < startsAt) {
    return {
      exists: true,
      next_status: PromotionStatusTypes.PLANNED,
      terminal: false,
      next_transition_at: startsAt.toISOString(),
      reason: "waiting_start",
    };
  }

  if (now >= startsAt && now < endsAt) {
    return {
      exists: true,
      next_status: PromotionStatusTypes.ACTIVE,
      terminal: false,
      next_transition_at: endsAt.toISOString(),
      reason: "inside_active_period",
    };
  }

  return {
    exists: true,
    next_status: PromotionStatusTypes.ARCHIVED,
    terminal: true,
    next_transition_at: null,
    reason: "promotion_finished",
  };
};

const resolveRegularPromotion = (
  promotion: PromotionModel,
  now: Date,
): PromotionLifecycleState => {
  if (
    !promotion.start_date ||
    !promotion.end_date ||
    !promotion.start_time ||
    !promotion.end_time
  ) {
    throw new Error(`PROMOTION_${promotion.id}_REGULAR_SCHEDULE_INVALID`);
  }

  const startDate = promotion.start_date;
  const endDate = promotion.end_date;

  const startTime = promotion.start_time;
  const endTime = promotion.end_time;

  const currentDate = getTashkentDateOnly(now);

  const weekdays = promotion.weekdays?.length
    ? promotion.weekdays
    : ALL_WEEKDAYS;

  if (currentDate > endDate) {
    return {
      exists: true,
      next_status: PromotionStatusTypes.ARCHIVED,
      terminal: true,
      next_transition_at: null,
      reason: "promotion_finished",
    };
  }

  /*
   * Hozirgi sana start_date dan oldin bo‘lsa,
   * qidiruvni start_date dan boshlaymiz.
   */
  let checkingDate = currentDate < startDate ? startDate : currentDate;

  /*
   * Eng ko‘pi bilan start_date → end_date
   * oralig‘ida keyingi valid sessionni qidiradi.
   */
  while (checkingDate <= endDate) {
    const weekday = getISOWeekday(checkingDate);

    if (weekdays.includes(weekday)) {
      const sessionStartsAt = tashkentDateTimeToUTC(checkingDate, startTime);

      const sessionEndsAt = tashkentDateTimeToUTC(checkingDate, endTime);

      if (sessionStartsAt >= sessionEndsAt) {
        throw new Error(
          `PROMOTION_${promotion.id}_OVERNIGHT_SCHEDULE_NOT_SUPPORTED`,
        );
      }

      /*
       * Bugungi valid session hali boshlanmagan.
       */
      if (now < sessionStartsAt) {
        return {
          exists: true,
          next_status: PromotionStatusTypes.PLANNED,
          terminal: false,
          next_transition_at: sessionStartsAt.toISOString(),
          reason:
            checkingDate === currentDate
              ? "waiting_start"
              : "waiting_next_session",
        };
      }

      /*
       * Hozir session ichidamiz.
       */
      if (now >= sessionStartsAt && now < sessionEndsAt) {
        return {
          exists: true,
          next_status: PromotionStatusTypes.ACTIVE,
          terminal: false,
          next_transition_at: sessionEndsAt.toISOString(),
          reason: "inside_active_period",
        };
      }
    }

    checkingDate = addDaysToDate(checkingDate, 1);
  }

  /*
   * End_date gacha boshqa valid session topilmadi.
   */
  return {
    exists: true,
    next_status: PromotionStatusTypes.ARCHIVED,
    terminal: true,
    next_transition_at: null,
    reason: "promotion_finished",
  };
};

export const GetPromotionLifecycleStateActivity = async (
  promotionID: number,
): Promise<PromotionLifecycleState> => {
  const promotionIDNumber = Number(promotionID);

  if (!Number.isInteger(promotionIDNumber) || promotionIDNumber <= 0) {
    throw new Error("PROMOTION_ID_IS_INVALID");
  }

  const promotion = await PromotionModel.findByPk(promotionIDNumber);

  if (!promotion) {
    return {
      exists: false,
      next_status: PromotionStatusTypes.ARCHIVED,
      terminal: true,
      next_transition_at: null,
      reason: "promotion_not_found",
    };
  }

  /*
   * Marketing yoki admin qo‘lda archive qilgan bo‘lsa,
   * workflow boshqa qayta ACTIVE qilmaydi.
   */
  if (promotion.status === PromotionStatusTypes.ARCHIVED) {
    return {
      exists: true,
      next_status: PromotionStatusTypes.ARCHIVED,
      terminal: true,
      next_transition_at: null,
      reason: "manually_archived",
    };
  }

  const now = new Date();

  if (promotion.type === PromotionTypes.ONE_TIME) {
    return resolveOneTimePromotion(promotion, now);
  }

  if (promotion.type === PromotionTypes.REGULAR) {
    return resolveRegularPromotion(promotion, now);
  }

  throw new Error(`PROMOTION_${promotion.id}_TYPE_INVALID`);
};

export const SyncPromotionStatusActivity = async (
  promotionID: number,
  nextStatus: PromotionTemporalStatus,
): Promise<void> => {
  const allowedStatuses: PromotionTemporalStatus[] = [
    PromotionStatusTypes.PLANNED,
    PromotionStatusTypes.ACTIVE,
    PromotionStatusTypes.ARCHIVED,
  ];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error("PROMOTION_TEMPORAL_STATUS_INVALID");
  }

  await PromotionModel.update(
    {
      status: nextStatus,
    },
    {
      where: {
        id: promotionID,

        /*
         * Keraksiz UPDATE qilmaymiz.
         */
        status: {
          [Op.ne]: nextStatus,
        },
      },
    },
  );
};
