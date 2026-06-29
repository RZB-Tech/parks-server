import { BadRequest } from "../exceptions";

export const getTashkentDayRangeUTC = (date = new Date()) => {
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;

  const tashkentNow = new Date(date.getTime() + tashkentOffsetMs);

  const startTashkent = new Date(
    Date.UTC(
      tashkentNow.getUTCFullYear(),
      tashkentNow.getUTCMonth(),
      tashkentNow.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  const endTashkent = new Date(
    Date.UTC(
      tashkentNow.getUTCFullYear(),
      tashkentNow.getUTCMonth(),
      tashkentNow.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  return {
    startDate: new Date(startTashkent.getTime() - tashkentOffsetMs),
    endDate: new Date(endTashkent.getTime() - tashkentOffsetMs),
  };
};

export const getTashkentDateOnly = (date = new Date()) => {
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;
  const tashkentDate = new Date(date.getTime() + tashkentOffsetMs);

  const year = tashkentDate.getUTCFullYear();
  const month = String(tashkentDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tashkentDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getTodayRange = () => {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const getDateRange = (date?: string) => {
  const targetDate = date ? new Date(date) : new Date();

  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const parseYYYYMMDD = (date: string) => {
  const [year, month, day] = date.split(".").map(Number);

  if (!year || !month || !day) {
    throw BadRequest("Invalid date format. Use YYYY.MM.DD");
  }

  return new Date(year, month - 1, day);
};

export const getAccountingDateRange = (query: GetAccountingCashboxReportsQuery) => {
  if (query.date) {
    const targetDate = parseYYYYMMDD(query.date);

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (query.start_date && query.end_date) {
    const startDate = parseYYYYMMDD(query.start_date);
    const endDate = parseYYYYMMDD(query.end_date);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  const today = new Date();

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};