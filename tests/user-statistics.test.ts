import assert from "node:assert/strict";
import { test } from "node:test";
import { sequelize } from "../src/plugins/db/postgresql/db";
import {
  GetUsersStatisticsService,
  USER_AGE_GROUPS,
} from "../src/services/users-services/UsersServices";

test("user age groups are ordered and do not overlap", () => {
  assert.deepEqual(
    USER_AGE_GROUPS.map((group) => [group.min_age, group.max_age]),
    [
      [6, 11],
      [12, 17],
      [18, 24],
      [25, 35],
      [36, 50],
      [51, null],
    ],
  );
});

test("user statistics returns chart-ready totals for a selected period", async (t) => {
  let queryOptions: any;

  t.mock.method(sequelize, "query", async (_sql: string, options: any) => {
    queryOptions = options;
    return [
      { age_group: "6_11", total: 12, added_in_period: 2 },
      { age_group: "25_35", total: "30", added_in_period: "5" },
      { age_group: "51_plus", total: 8, added_in_period: 1 },
      { age_group: "unclassified", total: 3, added_in_period: 1 },
    ] as any;
  });

  const result = await GetUsersStatisticsService(
    { from: "2026-10-01", to: "2026-10-06" },
    new Date("2026-10-06T10:00:00.000Z"),
  );

  assert.deepEqual(result.filter, {
    date: null,
    from: "2026-10-01",
    to: "2026-10-06",
  });
  assert.equal(result.groups.length, 6);
  assert.deepEqual(result.groups[0], {
    label: "6–11",
    min_age: 6,
    max_age: 11,
    total: 12,
    added_in_period: 2,
    percentage: 24,
  });
  assert.equal(result.groups[1].total, 0);
  assert.equal(result.groups[3].total, 30);
  assert.equal(result.groups[5].total, 8);
  assert.equal(
    queryOptions.replacements.ageCalculatedAt,
    "2026-10-06",
  );
  assert.equal(
    queryOptions.replacements.periodStart.toISOString(),
    "2026-09-30T19:00:00.000Z",
  );
  assert.equal(
    queryOptions.replacements.periodEnd.toISOString(),
    "2026-10-06T18:59:59.999Z",
  );
});

test("user statistics rejects mixed date and range filters", async () => {
  await assert.rejects(
    GetUsersStatisticsService({
      date: "2026-10-06",
      from: "2026-10-01",
      to: "2026-10-06",
    }),
    /date cannot be used together with from or to/,
  );
});
