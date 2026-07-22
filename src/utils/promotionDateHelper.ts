import { BadRequest } from "../exceptions";
import {
  PromotionStatusTypes,
  PromotionTypes,
} from "../models/postgresql/promotion-model/enums";

/*
 * Import pathni model joylashuvingizga moslang.
 *
 * Boshqa helper fayl yaratilmadi:
 * create, update va Temporal shu fayldan foydalanadi.
 */

const TASHKENT_TIMEZONE = "Asia/Tashkent";
const TASHKENT_OFFSET = "+05:00";

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/*
 * Quyidagi formatlarni qabul qiladi:
 *
 * 10:00
 * 10:00:00
 * 10:00:00.000000
 *
 * Natija har doim:
 * 10:00:00
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,6})?)?$/;

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const pad = (value: number): string => {
  return String(value).padStart(2, "0");
};

const getDateTimestamp = (
  value: Date | string | null | undefined,
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  return date.getTime();
};

const normalizeNullableTime = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  return normalizePromotionTime(value, "promotion_time");
};

/**
 * YYYY-MM-DD formatdagi sanani tekshiradi.
 *
 * Masalan:
 * 2026-07-21
 */
export const validatePromotionDate = (
  value: string,
  field = "promotion_date",
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw BadRequest(`${field.toUpperCase()}_IS_REQUIRED`);
  }

  const normalizedValue = value.trim();
  const match = DATE_REGEX.exec(normalizedValue);

  if (!match) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * HH:mm yoki HH:mm:ss qiymatini HH:mm:ss ga keltiradi.
 *
 * Masalan:
 * 10:00    -> 10:00:00
 * 10:00:30 -> 10:00:30
 */
export const normalizePromotionTime = (
  value: string,
  field = "promotion_time",
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw BadRequest(`${field.toUpperCase()}_IS_REQUIRED`);
  }

  const normalizedValue = value.trim();
  const match = TIME_REGEX.exec(normalizedValue);

  if (!match) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] ?? "00";

  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Tashkent sana-vaqtini JavaScript Date/UTC ga aylantiradi.
 *
 * 2026-07-21 + 10:00
 *
 * Tashkent:
 * 2026-07-21 10:00:00 +05:00
 *
 * UTC:
 * 2026-07-21T05:00:00.000Z
 */
export const tashkentDateTimeToUTC = (date: string, time: string): Date => {
  const normalizedDate = validatePromotionDate(date, "promotion_date");

  const normalizedTime = normalizePromotionTime(time, "promotion_time");

  const result = new Date(
    `${normalizedDate}T${normalizedTime}${TASHKENT_OFFSET}`,
  );

  if (Number.isNaN(result.getTime())) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  return result;
};

/**
 * Date qiymatidan Tashkent bo‘yicha YYYY-MM-DD qaytaradi.
 */
export const getTashkentDateOnly = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  return `${year}-${month}-${day}`;
};

/**
 * Date qiymatidan Tashkent bo‘yicha HH:mm:ss qaytaradi.
 */
export const getTashkentTimeOnly = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  const formatter = new Intl.DateTimeFormat("en-GB-u-hc-h23", {
    timeZone: TASHKENT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const hours = parts.find((part) => part.type === "hour")?.value;

  const minutes = parts.find((part) => part.type === "minute")?.value;

  const seconds = parts.find((part) => part.type === "second")?.value;

  if (!hours || !minutes || !seconds) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  return `${hours}:${minutes}:${seconds}`;
};

/**
 * YYYY-MM-DD sanaga kun qo‘shadi.
 *
 * 2026-07-21 + 1
 * -> 2026-07-22
 */
export const addPromotionDateDays = (value: string, days: number): string => {
  const date = validatePromotionDate(value, "promotion_date");

  if (!Number.isInteger(days)) {
    throw BadRequest("PROMOTION_DATE_DAYS_IS_INVALID");
  }

  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(Date.UTC(year, month - 1, day + days));

  return [
    result.getUTCFullYear(),
    pad(result.getUTCMonth() + 1),
    pad(result.getUTCDate()),
  ].join("-");
};

/**
 * ISO weekday:
 *
 * 1 = Monday
 * 2 = Tuesday
 * ...
 * 7 = Sunday
 */
export const getPromotionISOWeekday = (value: string): number => {
  const date = validatePromotionDate(value, "promotion_date");

  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  return weekday === 0 ? 7 : weekday;
};

/**
 * Weekdaylarni tekshiradi va takrorlarni olib tashlaydi.
 *
 * undefined bo‘lsa barcha kunlar qaytadi.
 * [] yuborilsa invalid hisoblanadi.
 */
export const normalizePromotionWeekdays = (weekdays?: number[]): number[] => {
  if (weekdays === undefined) {
    return [...ALL_WEEKDAYS];
  }

  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    throw BadRequest("PROMOTION_WEEKDAYS_ARE_REQUIRED");
  }

  const values = [...new Set(weekdays.map((weekday) => Number(weekday)))];

  const invalidWeekday = values.some(
    (weekday) => !Number.isInteger(weekday) || weekday < 1 || weekday > 7,
  );

  if (invalidWeekday) {
    throw BadRequest("PROMOTION_WEEKDAYS_ARE_INVALID");
  }

  return values.sort((first, second) => first - second);
};

/**
 * Ikki weekday array bir xil ekanini tekshiradi.
 */
export const promotionWeekdaysEqual = (
  first?: number[] | null,
  second?: number[] | null,
): boolean => {
  const left = [...(first ?? [])].map(Number).sort((a, b) => a - b);

  const right = [...(second ?? [])].map(Number).sort((a, b) => a - b);

  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

interface OneTimePromotionScheduleSource {
  starts_at?: Date | string | null;
  ends_at?: Date | string | null;
}

/**
 * ONE_TIME promotion modelidagi Date qiymatlarini
 * edit body uchun sana va vaqtga ajratadi.
 */
export const getOneTimeCurrentSchedule = (
  promotion: OneTimePromotionScheduleSource,
) => {
  const startsAt = promotion.starts_at ? new Date(promotion.starts_at) : null;

  const endsAt = promotion.ends_at ? new Date(promotion.ends_at) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw BadRequest("PROMOTION_START_DATE_TIME_IS_INVALID");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw BadRequest("PROMOTION_END_DATE_TIME_IS_INVALID");
  }

  return {
    startDate: startsAt ? getTashkentDateOnly(startsAt) : null,

    startTime: startsAt ? getTashkentTimeOnly(startsAt) : null,

    endDate: endsAt ? getTashkentDateOnly(endsAt) : null,

    endTime: endsAt ? getTashkentTimeOnly(endsAt) : null,
  };
};

export interface PromotionLifecycleData {
  type: PromotionTypes;

  starts_at?: Date | string | null;
  ends_at?: Date | string | null;

  start_date?: string | null;
  end_date?: string | null;

  start_time?: string | null;
  end_time?: string | null;

  weekdays?: number[] | null;
}

/**
 * Hozirgi vaqt bo‘yicha promotion statusini hisoblaydi.
 *
 * ONE_TIME:
 * PLANNED -> ACTIVE -> ARCHIVED
 *
 * REGULAR:
 * PLANNED -> ACTIVE -> PLANNED -> ... -> ARCHIVED
 */
export const resolvePromotionStatus = (
  data: PromotionLifecycleData,
  now = new Date(),
): PromotionStatusTypes => {
  if (Number.isNaN(now.getTime())) {
    throw BadRequest("CURRENT_DATE_TIME_IS_INVALID");
  }

  /*
   * ONE_TIME
   */
  if (data.type === PromotionTypes.ONE_TIME) {
    if (!data.starts_at || !data.ends_at) {
      throw BadRequest("ONE_TIME_PROMOTION_SCHEDULE_IS_REQUIRED");
    }

    const startsAt = new Date(data.starts_at);

    const endsAt = new Date(data.ends_at);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw BadRequest("ONE_TIME_PROMOTION_SCHEDULE_IS_INVALID");
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw BadRequest("PROMOTION_END_MUST_BE_AFTER_START");
    }

    if (now.getTime() < startsAt.getTime()) {
      return PromotionStatusTypes.PLANNED;
    }

    if (now.getTime() < endsAt.getTime()) {
      return PromotionStatusTypes.ACTIVE;
    }

    return PromotionStatusTypes.ARCHIVED;
  }

  /*
   * REGULAR
   */
  if (data.type === PromotionTypes.REGULAR) {
    if (
      !data.start_date ||
      !data.end_date ||
      !data.start_time ||
      !data.end_time
    ) {
      throw BadRequest("REGULAR_PROMOTION_SCHEDULE_IS_REQUIRED");
    }

    const startDate = validatePromotionDate(data.start_date, "start_date");

    const endDate = validatePromotionDate(data.end_date, "end_date");

    const startTime = normalizePromotionTime(data.start_time, "start_time");

    const endTime = normalizePromotionTime(data.end_time, "end_time");

    if (startDate > endDate) {
      throw BadRequest("PROMOTION_END_DATE_MUST_BE_AFTER_START_DATE");
    }

    if (startTime >= endTime) {
      throw BadRequest("OVERNIGHT_PROMOTION_IS_NOT_SUPPORTED");
    }

    const weekdays = data.weekdays?.length
      ? normalizePromotionWeekdays(data.weekdays)
      : [...ALL_WEEKDAYS];

    const currentDate = getTashkentDateOnly(now);

    if (currentDate > endDate) {
      return PromotionStatusTypes.ARCHIVED;
    }

    let checkingDate = currentDate < startDate ? startDate : currentDate;

    while (checkingDate <= endDate) {
      const weekday = getPromotionISOWeekday(checkingDate);

      if (weekdays.includes(weekday)) {
        const sessionStartsAt = tashkentDateTimeToUTC(checkingDate, startTime);

        const sessionEndsAt = tashkentDateTimeToUTC(checkingDate, endTime);

        /*
         * Bugungi yoki keyingi session
         * hali boshlanmagan.
         */
        if (now.getTime() < sessionStartsAt.getTime()) {
          return PromotionStatusTypes.PLANNED;
        }

        /*
         * Hozir session ichida.
         */
        if (
          now.getTime() >= sessionStartsAt.getTime() &&
          now.getTime() < sessionEndsAt.getTime()
        ) {
          return PromotionStatusTypes.ACTIVE;
        }
      }

      checkingDate = addPromotionDateDays(checkingDate, 1);
    }

    /*
     * End_date gacha boshqa session yo‘q.
     */
    return PromotionStatusTypes.ARCHIVED;
  }

  throw BadRequest("PROMOTION_TYPE_IS_INVALID");
};

/**
 * Schedule haqiqatan o‘zgarganini tekshiradi.
 */
export const isPromotionLifecycleChanged = (
  previous: PromotionLifecycleData,
  next: PromotionLifecycleData,
): boolean => {
  return (
    previous.type !== next.type ||
    getDateTimestamp(previous.starts_at) !== getDateTimestamp(next.starts_at) ||
    getDateTimestamp(previous.ends_at) !== getDateTimestamp(next.ends_at) ||
    (previous.start_date ?? null) !== (next.start_date ?? null) ||
    (previous.end_date ?? null) !== (next.end_date ?? null) ||
    normalizeNullableTime(previous.start_time) !==
      normalizeNullableTime(next.start_time) ||
    normalizeNullableTime(previous.end_time) !==
      normalizeNullableTime(next.end_time) ||
    !promotionWeekdaysEqual(previous.weekdays, next.weekdays)
  );
};

/*
 * Eski yozilgan service va Temporal kodlari buzilmasligi uchun
 * backward-compatible aliaslar.
 *
 * Keyingi kodlarda yuqoridagi asosiy nomlarni ishlating.
 */
export const validateDateOnly = validatePromotionDate;

export const createTashkentDateTime = tashkentDateTimeToUTC;

export const normalizeWeekdays = normalizePromotionWeekdays;

export const arraysEqual = promotionWeekdaysEqual;

export const addDateDays = addPromotionDateDays;

export const addDaysToDate = addPromotionDateDays;

export const getISOWeekday = getPromotionISOWeekday;

export interface PreparedPromotionSchedule {
  starts_at: Date | null;
  ends_at: Date | null;

  start_date: string | null;
  end_date: string | null;

  start_time: string | null;
  end_time: string | null;

  weekdays: number[] | null;
}

interface CurrentPromotionSchedule {
  type: PromotionTypes;

  starts_at: Date | string | null;
  ends_at: Date | string | null;

  start_date: string | null;
  end_date: string | null;

  start_time: string | null;
  end_time: string | null;

  weekdays: number[] | null;
}

interface PromotionScheduleUpdate {
  start_date?: string;
  end_date?: string;

  start_time?: string;
  end_time?: string;

  weekdays?: number[];
}

export const preparePromotionSchedule = (
  promotion: CurrentPromotionSchedule,
  body: PromotionScheduleUpdate,
  type: PromotionTypes,
): PreparedPromotionSchedule => {
  if (type === PromotionTypes.ONE_TIME) {
    const current =
      promotion.type === PromotionTypes.ONE_TIME
        ? getOneTimeCurrentSchedule(promotion)
        : {
            startDate: null,
            endDate: null,
            startTime: null,
            endTime: null,
          };

    const startDate = body.start_date ?? current.startDate;
    const endDate = body.end_date ?? current.endDate;

    const startTime = body.start_time ?? current.startTime;
    const endTime = body.end_time ?? current.endTime;

    if (!startDate || !endDate || !startTime || !endTime) {
      throw BadRequest("ONE_TIME_PROMOTION_SCHEDULE_IS_REQUIRED");
    }

    const startsAt = tashkentDateTimeToUTC(
      validatePromotionDate(startDate, "start_date"),
      normalizePromotionTime(startTime, "start_time"),
    );

    const endsAt = tashkentDateTimeToUTC(
      validatePromotionDate(endDate, "end_date"),
      normalizePromotionTime(endTime, "end_time"),
    );

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw BadRequest("PROMOTION_END_MUST_BE_AFTER_START");
    }

    return {
      starts_at: startsAt,
      ends_at: endsAt,

      start_date: null,
      end_date: null,

      start_time: null,
      end_time: null,

      weekdays: null,
    };
  }

  const startTime =
    body.start_time ??
    (promotion.type === PromotionTypes.REGULAR ? promotion.start_time : null);

  const endTime =
    body.end_time ??
    (promotion.type === PromotionTypes.REGULAR ? promotion.end_time : null);

  if (!startTime || !endTime) {
    throw BadRequest("REGULAR_PROMOTION_TIME_IS_REQUIRED");
  }

  const normalizedStartTime = normalizePromotionTime(startTime, "start_time");

  const normalizedEndTime = normalizePromotionTime(endTime, "end_time");

  if (normalizedStartTime >= normalizedEndTime) {
    throw BadRequest("REGULAR_PROMOTION_OVERNIGHT_IS_NOT_SUPPORTED");
  }

  const weekdays =
    body.weekdays !== undefined
      ? normalizePromotionWeekdays(body.weekdays)
      : promotion.type === PromotionTypes.REGULAR && promotion.weekdays?.length
        ? normalizePromotionWeekdays(promotion.weekdays)
        : normalizePromotionWeekdays();

  return {
    starts_at: null,
    ends_at: null,

    start_date: null,
    end_date: null,

    start_time: normalizedStartTime,
    end_time: normalizedEndTime,

    weekdays,
  };
};