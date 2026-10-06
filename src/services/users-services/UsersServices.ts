import { QueryTypes } from "sequelize";
import { BadRequest } from "../../exceptions";
import { sequelize } from "../../plugins/db/postgresql/db";
import {
  getAccountingDateRange,
  getTashkentDateOnly,
} from "../../utils/date";

type UserAgeGroupKey =
  | "6_11"
  | "12_17"
  | "18_24"
  | "25_35"
  | "36_50"
  | "51_plus";

type UserAgeGroupDefinition = {
  key: UserAgeGroupKey;
  label: string;
  min_age: number;
  max_age: number | null;
};

type UserStatisticsRow = {
  age_group: UserAgeGroupKey | "unclassified";
  total: string | number;
  added_in_period: string | number;
};

export const USER_AGE_GROUPS: readonly UserAgeGroupDefinition[] = [
  { key: "6_11", label: "6–11", min_age: 6, max_age: 11 },
  { key: "12_17", label: "12–17", min_age: 12, max_age: 17 },
  { key: "18_24", label: "18–24", min_age: 18, max_age: 24 },
  { key: "25_35", label: "25–35", min_age: 25, max_age: 35 },
  { key: "36_50", label: "36–50", min_age: 36, max_age: 50 },
  { key: "51_plus", label: "51+", min_age: 51, max_age: null },
] as const;

const roundPercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return Number(((value / total) * 100).toFixed(2));
};

const getDateRange = (query: GetUsersStatisticsQuery) => {
  if (query.date && (query.from || query.to)) {
    throw BadRequest("date cannot be used together with from or to");
  }

  const range = getAccountingDateRange({
    date: query.date,
    start_date: query.from,
    end_date: query.to,
  });

  return {
    start: range.start,
    end: range.end,
  };
};

const getFilter = (
  query: GetUsersStatisticsQuery,
  range: { start: Date; end: Date },
) => {
  const defaultDate = getTashkentDateOnly(range.start);

  return {
    date: query.date ?? null,
    from: query.date ?? query.from ?? defaultDate,
    to: query.date ?? query.to ?? defaultDate,
  };
};

export const GetUsersStatisticsService = async (
  query: GetUsersStatisticsQuery,
  now = new Date(),
) => {
  const range = getDateRange(query);
  const ageCalculatedAt = getTashkentDateOnly(now);

  const rows = await sequelize.query<UserStatisticsRow>(
    `
      WITH registered_users AS (
        SELECT
          registered_at,
          CASE
            WHEN date_of_birth IS NULL THEN NULL
            ELSE EXTRACT(
              YEAR FROM age(CAST(:ageCalculatedAt AS date), date_of_birth)
            )::integer
          END AS age
        FROM users
        WHERE deleted_at IS NULL
          AND registered_at IS NOT NULL
      ), grouped_users AS (
        SELECT
          registered_at,
          CASE
            WHEN age BETWEEN 6 AND 11 THEN '6_11'
            WHEN age BETWEEN 12 AND 17 THEN '12_17'
            WHEN age BETWEEN 18 AND 24 THEN '18_24'
            WHEN age BETWEEN 25 AND 35 THEN '25_35'
            WHEN age BETWEEN 36 AND 50 THEN '36_50'
            WHEN age >= 51 THEN '51_plus'
            ELSE 'unclassified'
          END AS age_group
        FROM registered_users
      )
      SELECT
        age_group,
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (
          WHERE registered_at BETWEEN :periodStart AND :periodEnd
        )::integer AS added_in_period
      FROM grouped_users
      GROUP BY age_group
    `,
    {
      replacements: {
        ageCalculatedAt,
        periodStart: range.start,
        periodEnd: range.end,
      },
      type: QueryTypes.SELECT,
    },
  );

  const totalsByGroup = new Map(
    rows.map((row) => [
      row.age_group,
      {
        total: Number(row.total) || 0,
        added_in_period: Number(row.added_in_period) || 0,
      },
    ]),
  );
  const classifiedUsers = USER_AGE_GROUPS.reduce(
    (total, definition) =>
      total + (totalsByGroup.get(definition.key)?.total ?? 0),
    0,
  );

  return {
    filter: getFilter(query, range),
    groups: USER_AGE_GROUPS.map((definition) => {
      const counts = totalsByGroup.get(definition.key) ?? {
        total: 0,
        added_in_period: 0,
      };
      const { key: _key, ...publicDefinition } = definition;

      return {
        ...publicDefinition,
        total: counts.total,
        added_in_period: counts.added_in_period,
        percentage: roundPercentage(counts.total, classifiedUsers),
      };
    }),
  };
};
