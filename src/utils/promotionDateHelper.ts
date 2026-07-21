import { BadRequest } from "../exceptions";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const validatePromotionDate = (value: string, field: string) => {
  if (!DATE_REGEX.test(value)) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  return value;
};

export const normalizePromotionTime = (value: string, field: string) => {
  if (!TIME_REGEX.test(value)) {
    throw BadRequest(`${field.toUpperCase()}_IS_INVALID`);
  }

  return `${value}:00`;
};

export const tashkentDateTimeToUTC = (date: string, time: string) => {
  const result = new Date(`${date}T${time}+05:00`);

  if (Number.isNaN(result.getTime())) {
    throw BadRequest("PROMOTION_DATE_TIME_IS_INVALID");
  }

  return result;
};

export const normalizePromotionWeekdays = (weekdays?: number[]) => {
  const values = weekdays?.length
    ? [...new Set(weekdays)]
    : [1, 2, 3, 4, 5, 6, 7];

  const invalidWeekday = values.some(
    (weekday) => !Number.isInteger(weekday) || weekday < 1 || weekday > 7,
  );

  if (invalidWeekday) {
    throw BadRequest("PROMOTION_WEEKDAYS_ARE_INVALID");
  }

  return values.sort((a, b) => a - b);
};
