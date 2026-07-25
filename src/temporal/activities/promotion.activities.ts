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
  /*
   * REGULAR promotion uchun start_date va end_date kerak emas.
   * U faqat start_time, end_time va weekdays asosida
   * cheksiz takrorlanadi.
   */
  if (!promotion.start_time || !promotion.end_time) {
    throw new Error(`PROMOTION_${promotion.id}_REGULAR_SCHEDULE_INVALID`);
  }

  const startTime = promotion.start_time;
  const endTime = promotion.end_time;

  const weekdays =
    Array.isArray(promotion.weekdays) && promotion.weekdays.length > 0
      ? [...new Set(promotion.weekdays.map(Number))]
      : ALL_WEEKDAYS;

  /*
   * ISO weekday:
   * 1 = Monday
   * 7 = Sunday
   */
  const hasInvalidWeekday = weekdays.some(
    (weekday) => !Number.isInteger(weekday) || weekday < 1 || weekday > 7,
  );

  if (hasInvalidWeekday) {
    throw new Error(`PROMOTION_${promotion.id}_WEEKDAYS_INVALID`);
  }

  const currentDate = getTashkentDateOnly(now);

  /*
   * Eng ko‘pi bilan 7 kun oldinga qaraymiz.
   *
   * offset <= 7 bo‘lishi kerak:
   * bugungi session tugagan bo‘lsa,
   * keyingi xuddi shu weekday 7 kundan keyin bo‘lishi mumkin.
   */
  for (let offset = 0; offset <= 7; offset += 1) {
    const checkingDate =
      offset === 0 ? currentDate : addDaysToDate(currentDate, offset);

    const weekday = getISOWeekday(checkingDate);

    if (!weekdays.includes(weekday)) {
      continue;
    }

    const sessionStartsAt = tashkentDateTimeToUTC(checkingDate, startTime);

    const sessionEndsAt = tashkentDateTimeToUTC(checkingDate, endTime);

    /*
     * Hozircha bir kundan keyingi vaqtga o‘tadigan
     * session qo‘llab-quvvatlanmaydi.
     *
     * Masalan:
     * start_time = 22:00
     * end_time   = 02:00
     */
    if (sessionStartsAt >= sessionEndsAt) {
      throw new Error(
        `PROMOTION_${promotion.id}_OVERNIGHT_SCHEDULE_NOT_SUPPORTED`,
      );
    }

    /*
     * Bugungi valid session hali boshlanmagan.
     */
    if (offset === 0 && now < sessionStartsAt) {
      return {
        exists: true,
        next_status: PromotionStatusTypes.PLANNED,
        terminal: false,
        next_transition_at: sessionStartsAt.toISOString(),
        reason: "waiting_start",
      };
    }

    /*
     * Hozir bugungi session ichidamiz.
     */
    if (offset === 0 && now >= sessionStartsAt && now < sessionEndsAt) {
      return {
        exists: true,
        next_status: PromotionStatusTypes.ACTIVE,
        terminal: false,
        next_transition_at: sessionEndsAt.toISOString(),
        reason: "inside_active_period",
      };
    }

    /*
     * Bugungi session tugagan yoki bugun valid weekday emas.
     * Keyingi valid kun topildi.
     */
    if (offset > 0) {
      return {
        exists: true,
        next_status: PromotionStatusTypes.PLANNED,
        terminal: false,
        next_transition_at: sessionStartsAt.toISOString(),
        reason: "waiting_next_session",
      };
    }

    /*
     * offset === 0, lekin now >= sessionEndsAt.
     * Bugungi session tugagan, keyingi kunni qidirishda davom etamiz.
     */
  }

  /*
   * Valid weekdays mavjud bo‘lsa, amalda bu qismga kelmasligi kerak.
   */
  throw new Error(`PROMOTION_${promotion.id}_NEXT_REGULAR_SESSION_NOT_FOUND`);
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
   * Manual archive qilingan promotionni
   * workflow qayta ACTIVE qilmaydi.
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
