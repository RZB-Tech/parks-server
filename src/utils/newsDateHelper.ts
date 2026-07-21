import { BadRequest } from "../exceptions";

const TASHKENT_OFFSET = "+05:00";

const pad = (value: number): string => {
  return String(value).padStart(2, "0");
};

export const normalizeNewsDateOnly = (
  value: string,
  fieldName: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw BadRequest(`${fieldName} is required`);
  }

  const trimmedValue = value.trim();

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  const dotMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmedValue);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dotMatch) {
    day = Number(dotMatch[1]);
    month = Number(dotMatch[2]);
    year = Number(dotMatch[3]);
  } else {
    throw BadRequest(
      `${fieldName} format is invalid. Use YYYY-MM-DD or DD.MM.YYYY`,
    );
  }

  const validationDate = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    validationDate.getUTCFullYear() === year &&
    validationDate.getUTCMonth() === month - 1 &&
    validationDate.getUTCDate() === day;

  if (!isValidDate) {
    throw BadRequest(`${fieldName} is invalid`);
  }

  return `${year}-${pad(month)}-${pad(day)}`;
};

export const getTashkentDayStart = (value: string, fieldName: string): Date => {
  const dateOnly = normalizeNewsDateOnly(value, fieldName);

  const date = new Date(`${dateOnly}T00:00:00.000${TASHKENT_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    throw BadRequest(`${fieldName} is invalid`);
  }

  return date;
};

export const getTashkentDayEnd = (value: string, fieldName: string): Date => {
  const dateOnly = normalizeNewsDateOnly(value, fieldName);

  const date = new Date(`${dateOnly}T23:59:59.999${TASHKENT_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    throw BadRequest(`${fieldName} is invalid`);
  }

  return date;
};
