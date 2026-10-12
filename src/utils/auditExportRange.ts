import { BadRequest } from "../exceptions";
import { getTashkentRangeUTC } from "./date";

export const AUDIT_EXPORT_DATE_TIME_PATTERN =
  "^\\d{4}-\\d{2}-\\d{2}T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d+)?(Z|[+-]([01]\\d|2[0-3]):[0-5]\\d)$";

const dateTimePattern = new RegExp(AUDIT_EXPORT_DATE_TIME_PATTERN);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const parseBoundary = (value: string, end: boolean) => {
  if (typeof value !== "string") {
    throw BadRequest("from and to are required");
  }

  if (datePattern.test(value)) {
    const range = getTashkentRangeUTC(value, value);
    return end
      ? new Date(range.endDate.getTime() + 1)
      : range.startDate;
  }

  if (!dateTimePattern.test(value)) {
    throw BadRequest("Use YYYY-MM-DD or an ISO date-time with timezone");
  }

  // Reject impossible calendar dates before Date can normalize them.
  getTashkentRangeUTC(value.slice(0, 10), value.slice(0, 10));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw BadRequest("Invalid date value");
  return parsed;
};

export const getAuditExportRange = (query: ExportAuditLogsQuery) => {
  const start = parseBoundary(query.from, false);
  const end = parseBoundary(query.to, true);

  if (start >= end) {
    throw BadRequest("from must be earlier than to");
  }

  // Date-only 'to' includes the whole Tashkent day; date-time 'to' is exclusive.
  return { start, end };
};
