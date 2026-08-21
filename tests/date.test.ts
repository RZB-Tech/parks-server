import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getTashkentBusinessDateOnly,
  getTashkentBusinessDayRangeUTC,
} from "../src/utils/date";

test("00:00-02:59 Tashkent belongs to the previous business date", () => {
  assert.equal(
    getTashkentBusinessDateOnly(new Date("2026-08-20T19:00:00.000Z")),
    "2026-08-20",
  );
  assert.equal(
    getTashkentBusinessDateOnly(new Date("2026-08-20T21:59:59.999Z")),
    "2026-08-20",
  );
});

test("03:00 Tashkent starts a new business date", () => {
  assert.equal(
    getTashkentBusinessDateOnly(new Date("2026-08-20T22:00:00.000Z")),
    "2026-08-21",
  );
});

test("explicit business date maps to a half-open 03:00-03:00 UTC range", () => {
  const range = getTashkentBusinessDayRangeUTC("2026-08-20");

  assert.equal(range.businessDate, "2026-08-20");
  assert.equal(range.startDate.toISOString(), "2026-08-19T22:00:00.000Z");
  assert.equal(range.endDate.toISOString(), "2026-08-20T22:00:00.000Z");
});

test("current range before 03:00 keeps the previous business date", () => {
  const range = getTashkentBusinessDayRangeUTC(
    new Date("2026-08-20T20:30:00.000Z"),
  );

  assert.equal(range.businessDate, "2026-08-20");
  assert.equal(range.startDate.toISOString(), "2026-08-19T22:00:00.000Z");
  assert.equal(range.endDate.toISOString(), "2026-08-20T22:00:00.000Z");
});

test("invalid explicit business date is rejected", () => {
  assert.throws(() => getTashkentBusinessDayRangeUTC("2026-02-30"));
});
