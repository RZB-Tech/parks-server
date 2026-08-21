import { BadRequest } from "../exceptions";

const TASHKENT_OFFSET_HOURS = 5;
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;

export const BUSINESS_DAY_CUTOFF_HOUR = 3;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateTime = (date: string | Date) => {
  const parsed = date instanceof Date ? new Date(date.getTime()) : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw BadRequest("Invalid date value");
  }

  return parsed;
};

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

/**
 * Returns the Tashkent business date containing the supplied instant.
 *
 * A business day starts at 03:00 Asia/Tashkent and ends immediately before
 * 03:00 on the following calendar day. Therefore 00:00-02:59 belongs to the
 * previous business date.
 */
export const getTashkentBusinessDateOnly = (date = new Date()) => {
  const parsed = parseDateTime(date);
  const businessDate = new Date(
    parsed.getTime() +
      TASHKENT_OFFSET_MS -
      BUSINESS_DAY_CUTOFF_HOUR * 60 * 60 * 1000,
  );

  const year = businessDate.getUTCFullYear();
  const month = String(businessDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(businessDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Returns a half-open UTC range [startDate, endDate) for a Tashkent business
 * date. An explicit YYYY-MM-DD value identifies that business date; when the
 * value is omitted, the business date is derived from the current instant.
 */
export const getTashkentBusinessDayRangeUTC = (date?: string | Date) => {
  const businessDate =
    typeof date === "string"
      ? date
      : getTashkentBusinessDateOnly(date ?? new Date());
  const { year, month, day } = parseDateOnly(businessDate);

  const startDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      BUSINESS_DAY_CUTOFF_HOUR - TASHKENT_OFFSET_HOURS,
      0,
      0,
      0,
    ),
  );
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    businessDate,
    startDate,
    endDate,
  };
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

/**
 * Returns the latest occurrence of a Tashkent wall-clock time at or before
 * the supplied reference time. Tashkent currently has a fixed UTC+5 offset.
 *
 * Scheduled jobs use this cutoff instead of the activity execution time so a
 * delayed 03:00/23:59 job cannot close reports opened after its boundary.
 */
export const getMostRecentTashkentCutoffUTC = (
  referenceTime: string | Date,
  hour: number,
  minute: number,
) => {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw BadRequest("Invalid cutoff time");
  }

  const reference = parseDateTime(referenceTime);
  const tashkentReference = new Date(
    reference.getTime() + TASHKENT_OFFSET_MS,
  );

  let cutoff = new Date(
    Date.UTC(
      tashkentReference.getUTCFullYear(),
      tashkentReference.getUTCMonth(),
      tashkentReference.getUTCDate(),
      hour - TASHKENT_OFFSET_HOURS,
      minute,
      0,
      0,
    ),
  );

  if (cutoff.getTime() > reference.getTime()) {
    cutoff = new Date(cutoff.getTime() - 24 * 60 * 60 * 1000);
  }

  return cutoff;
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

export const getTashkentMonthRangeUTC = (value: string) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (!match) {
    throw BadRequest("INVALID_MONTH_FORMAT");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw BadRequest("INVALID_YEAR");
  }

  const tashkentOffsetMs = 5 * 60 * 60 * 1000;

  const startUTC = new Date(
    Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - tashkentOffsetMs,
  );

  const endUTC = new Date(
    Date.UTC(year, month, 1, 0, 0, 0, 0) - tashkentOffsetMs,
  );

  return {
    startUTC,
    endUTC,
  };
};

const pad = (value: number) => String(value).padStart(2, "0");

export const addDaysToDate = (date: string, days: number): string => {
  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(Date.UTC(year, month - 1, day + days));

  return [
    result.getUTCFullYear(),
    pad(result.getUTCMonth() + 1),
    pad(result.getUTCDate()),
  ].join("-");
};

/*
 * 1 = Monday
 * 7 = Sunday
 */
export const getISOWeekday = (date: string): number => {
  const utcDate = new Date(`${date}T00:00:00Z`);
  const day = utcDate.getUTCDay();

  return day === 0 ? 7 : day;
};
