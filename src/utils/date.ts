import { BadRequest } from "../exceptions";

const TASHKENT_OFFSET_HOURS = 5;
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (date: string) => {
  if (!DATE_REGEX.test(date)) {
    throw BadRequest("Invalid date format. Use YYYY-MM-DD");
  }

  const [year, month, day] = date.split("-").map(Number);

  const checkDate = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    checkDate.getUTCFullYear() === year &&
    checkDate.getUTCMonth() === month - 1 &&
    checkDate.getUTCDate() === day;

  if (!isRealDate) {
    throw BadRequest("Invalid date value");
  }

  return {
    year,
    month,
    day,
  };
};

export const getTashkentDateOnly = (date = new Date()) => {
  const tashkentDate = new Date(date.getTime() + TASHKENT_OFFSET_MS);

  const year = tashkentDate.getUTCFullYear();
  const month = String(tashkentDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tashkentDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getTashkentDayRangeUTC = (date?: string | Date) => {
  const dateOnly =
    typeof date === "string" ? date : getTashkentDateOnly(date ?? new Date());

  const { year, month, day } = parseDateOnly(dateOnly);

  const startDate = new Date(
    Date.UTC(year, month - 1, day, -TASHKENT_OFFSET_HOURS, 0, 0, 0),
  );

  const endDate = new Date(
    Date.UTC(year, month - 1, day, 23 - TASHKENT_OFFSET_HOURS, 59, 59, 999),
  );

  return {
    startDate,
    endDate,
  };
};

export const getTashkentRangeUTC = (startDate: string, endDate: string) => {
  const startParts = parseDateOnly(startDate);
  const endParts = parseDateOnly(endDate);

  const start = new Date(
    Date.UTC(
      startParts.year,
      startParts.month - 1,
      startParts.day,
      -TASHKENT_OFFSET_HOURS,
      0,
      0,
      0,
    ),
  );

  const end = new Date(
    Date.UTC(
      endParts.year,
      endParts.month - 1,
      endParts.day,
      23 - TASHKENT_OFFSET_HOURS,
      59,
      59,
      999,
    ),
  );

  if (start > end) {
    throw BadRequest("start_date cannot be greater than end_date");
  }

  return {
    startDate: start,
    endDate: end,
  };
};

export const getDateRange = (date?: string) => {
  const { startDate, endDate } = getTashkentDayRangeUTC(date);

  return {
    start: startDate,
    end: endDate,
  };
};

export const getTodayRange = () => {
  const { startDate, endDate } = getTashkentDayRangeUTC();

  return {
    start: startDate,
    end: endDate,
  };
};

export const getAccountingDateRange = (
  query: GetAccountingCashboxReportsQuery,
) => {
  if (query.date) {
    const { startDate, endDate } = getTashkentDayRangeUTC(query.date);

    return {
      start: startDate,
      end: endDate,
    };
  }

  if (query.start_date || query.end_date) {
    if (!query.start_date || !query.end_date) {
      throw BadRequest("start_date and end_date are required together");
    }

    const { startDate, endDate } = getTashkentRangeUTC(
      query.start_date,
      query.end_date,
    );

    return {
      start: startDate,
      end: endDate,
    };
  }

  const { startDate, endDate } = getTashkentDayRangeUTC();

  return {
    start: startDate,
    end: endDate,
  };
};
