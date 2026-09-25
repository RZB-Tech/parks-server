import assert from "node:assert/strict";
import { test } from "node:test";
import { isVisibleAt } from "../src/utils/softDeleteVisibility";

const periodStart = new Date("2026-08-20T00:00:00.000Z");

test("active entities remain visible", () => {
  assert.equal(isVisibleAt({ deletedAt: null }, periodStart), true);
});

test("entities deleted before the requested period are hidden", () => {
  assert.equal(
    isVisibleAt(
      { deletedAt: new Date("2026-08-19T23:59:59.999Z") },
      periodStart,
    ),
    false,
  );
});

test("historical reports can include an entity until its deletion time", () => {
  assert.equal(
    isVisibleAt(
      { deleted_at: "2026-08-20T12:00:00.000Z" },
      new Date("2026-08-20T11:59:59.999Z"),
    ),
    true,
  );
  assert.equal(
    isVisibleAt(
      { deleted_at: "2026-08-20T12:00:00.000Z" },
      new Date("2026-08-20T12:00:00.001Z"),
    ),
    false,
  );
});
