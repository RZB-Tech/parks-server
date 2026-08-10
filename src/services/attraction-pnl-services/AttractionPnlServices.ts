import { Op, QueryTypes } from "sequelize";
import { AttractionPnlDTO } from "../../dtos/attraction-pnl-dtos/AttractionPnlDto";
import { BadRequest } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import {
  AttractionReportStatusTypes,
  AttractionReportTypes,
} from "../../models/postgresql/attraction-report-model/enums";
import { sequelize } from "../../plugins/db/postgresql/db";
import { getTashkentMonthRangeUTC } from "../../utils/date";

const MAX_MONTHS = 60;

const getMonthSequence = (startMonth: string, endMonth: string) => {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const startIndex = startYear * 12 + startMonthNumber - 1;
  const endIndex = endYear * 12 + endMonthNumber - 1;

  if (startIndex > endIndex) {
    throw BadRequest("start_month must be before or equal to end_month");
  }

  const monthCount = endIndex - startIndex + 1;

  if (monthCount > MAX_MONTHS) {
    throw BadRequest(`Month range cannot exceed ${MAX_MONTHS} months`);
  }

  return Array.from({ length: monthCount }, (_, index) => {
    const absoluteMonth = startIndex + index;
    const year = Math.floor(absoluteMonth / 12);
    const month = (absoluteMonth % 12) + 1;

    return `${year}-${String(month).padStart(2, "0")}`;
  });
};

export const GetAttractionPnlService = async (
  query: GetAttractionPnlQuery,
): Promise<AttractionPnlResponseDTO> => {
  const startMonth = query.start_month?.trim();
  const endMonth = query.end_month?.trim();

  if (!startMonth || !endMonth) {
    throw BadRequest("start_month and end_month are required");
  }

  const { startUTC } = getTashkentMonthRangeUTC(startMonth);
  const { endUTC } = getTashkentMonthRangeUTC(endMonth);
  const months = getMonthSequence(startMonth, endMonth);

  const rows = await sequelize.query<AttractionPnlAggregationRow>(
    `
      WITH confirmed_zreports AS (
        SELECT
          id,
          attraction,
          TO_CHAR(
            opened_at AT TIME ZONE 'Asia/Tashkent',
            'YYYY-MM'
          ) AS month,
          COALESCE(total_amount, 0)::NUMERIC AS total_amount
        FROM attraction_reports
        WHERE deleted_at IS NULL
          AND report_type = :reportType
          AND status = :reportStatus
          AND opened_at >= :startDate
          AND opened_at < :endDate
      ),
      monthly_parts AS (
        SELECT
          attraction,
          month,
          SUM(total_amount)::NUMERIC AS total
        FROM confirmed_zreports
        GROUP BY attraction, month

        UNION ALL

        SELECT
          zreport.attraction,
          zreport.month,
          SUM(COALESCE(promotion_report.total_amount, 0))::NUMERIC AS total
        FROM confirmed_zreports AS zreport
        INNER JOIN promotion_reports AS promotion_report
          ON promotion_report.zreport = zreport.id
        GROUP BY zreport.attraction, zreport.month
      )
      SELECT
        attraction::TEXT AS attraction_id,
        month,
        SUM(total)::TEXT AS total
      FROM monthly_parts
      GROUP BY attraction, month
      ORDER BY attraction ASC, month ASC
    `,
    {
      replacements: {
        reportType: AttractionReportTypes.ZREPORT,
        reportStatus: AttractionReportStatusTypes.CONFIRMED,
        startDate: startUTC,
        endDate: endUTC,
      },
      type: QueryTypes.SELECT,
    },
  );

  const historicalAttractionIDs = [
    ...new Set(
      rows
        .map((row) => Number(row.attraction_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  const attractionWhere: any = historicalAttractionIDs.length
    ? {
        [Op.or]: [
          { deletedAt: null },
          { id: { [Op.in]: historicalAttractionIDs } },
        ],
      }
    : { deletedAt: null };

  const attractions = await AttractionModel.findAll({
    paranoid: false,
    attributes: ["id", "name"],
    where: attractionWhere,
    order: [["id", "ASC"]],
  });

  return AttractionPnlDTO({
    start_month: startMonth,
    end_month: endMonth,
    months,
    attractions: attractions.map((attraction) => ({
      id: Number(attraction.id),
      name: attraction.name,
    })),
    rows,
  });
};
