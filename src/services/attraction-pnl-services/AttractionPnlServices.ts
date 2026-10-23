import { Op, QueryTypes } from "sequelize";
import { AttractionPnlDTO } from "../../dtos/attraction-pnl-dtos/AttractionPnlDto";
import { BadRequest } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { CardType } from "../../models/postgresql/cards-model/enums";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
} from "../../models/postgresql/card-transactions-model/enums";
import {
  AttractionReportStatusTypes,
  AttractionReportTypes,
} from "../../models/postgresql/attraction-report-model/enums";
import { sequelize } from "../../plugins/db/postgresql/db";
import { getTashkentMonthRangeUTC } from "../../utils/date";
import { getSoftDeleteVisibilityWhere } from "../../utils/softDeleteVisibility";

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
          ar.id,
          ar.attraction,
          TO_CHAR(
            ar.opened_at AT TIME ZONE 'Asia/Tashkent',
            'YYYY-MM'
          ) AS month,
          COALESCE(ar.total_amount, 0)::NUMERIC AS total_amount,
          COALESCE(ar.total_people, 0) AS people_count,
          COALESCE(ar.total_virtual, 0) AS virtual_count,
          COALESCE(ar.total_classic, 0) AS classic_count,
          COALESCE(ar.total_vip, 0) AS vip_count,
          COALESCE(ar.total_organization, 0) AS organization_count
        FROM attraction_reports AS ar
        INNER JOIN attractions AS a
          ON a.id = ar.attraction
        WHERE ar.deleted_at IS NULL
          AND ar.report_type = :reportType
          AND ar.status = :reportStatus
          AND ar.opened_at >= :startDate
          AND ar.opened_at < :endDate
          AND (
            a.deleted_at IS NULL
            OR ar.opened_at <= a.deleted_at
          )
      ),
      -- Base reports can contain multiple tariffs. Use each VIP payment's
      -- price snapshot and remaining people after refunds, rather than the
      -- attraction's current price. Fully refunded payments are cancelled.
      vip_basic_totals AS (
        SELECT
          zreport.id AS zreport,
          SUM(
            COALESCE(payment.sale_unit_price, 0)::NUMERIC
              * GREATEST(
                  COALESCE(payment.people_count, 0)
                    - COALESCE(refunds.people_count, 0),
                  0
                )
          ) AS total
        FROM confirmed_zreports AS zreport
        INNER JOIN attraction_reports AS xreport
          ON xreport.zreport = zreport.id
          AND xreport.attraction = zreport.attraction
          AND xreport.report_type = :xreportType
        INNER JOIN card_transactions AS payment
          ON payment.xreport = xreport.id
          AND payment.attraction = zreport.attraction
        INNER JOIN cards AS card
          ON card.id = payment.card
          AND card.type = :vipCardType
        LEFT JOIN LATERAL (
          SELECT SUM(refund.people_count) AS people_count
          FROM attraction_round_refunds AS refund
          INNER JOIN card_transactions AS refund_transaction
            ON refund_transaction.id = refund.refund_transaction
            AND refund_transaction.status = :successStatus
            AND refund_transaction.deleted_at IS NULL
          WHERE refund.original_transaction = payment.id
        ) AS refunds ON TRUE
        WHERE payment.type = :paymentType
          AND payment.status = :successStatus
          AND payment.deleted_at IS NULL
          AND payment.promotion IS NULL
        GROUP BY zreport.id
      ),
      monthly_parts AS (
        SELECT
          zreport.attraction,
          zreport.month,
          SUM(zreport.total_amount - COALESCE(vip.total, 0))::NUMERIC AS total,
          SUM(zreport.people_count) AS people_count,
          SUM(zreport.virtual_count) AS virtual_count,
          SUM(zreport.classic_count) AS classic_count,
          SUM(zreport.vip_count) AS vip_count,
          SUM(zreport.organization_count) AS organization_count
        FROM confirmed_zreports AS zreport
        LEFT JOIN vip_basic_totals AS vip ON vip.zreport = zreport.id
        GROUP BY zreport.attraction, zreport.month

        UNION ALL

        SELECT
          zreport.attraction,
          zreport.month,
          -- Promotion rows have a fixed price and already-net refunded counts.
          SUM(
            COALESCE(promotion_report.total_amount, 0)::NUMERIC
              - COALESCE(promotion_report.total_vip, 0)::NUMERIC
                * COALESCE(promotion_report.sale_unit_price, 0)
          ) AS total,
          SUM(COALESCE(promotion_report.total_people, 0)) AS people_count,
          SUM(COALESCE(promotion_report.total_virtual, 0)) AS virtual_count,
          SUM(COALESCE(promotion_report.total_classic, 0)) AS classic_count,
          SUM(COALESCE(promotion_report.total_vip, 0)) AS vip_count,
          SUM(COALESCE(promotion_report.total_organization, 0)) AS organization_count
        FROM confirmed_zreports AS zreport
        INNER JOIN promotion_reports AS promotion_report
          ON promotion_report.zreport = zreport.id
        GROUP BY zreport.attraction, zreport.month
      ),
      monthly_totals AS (
        SELECT
          attraction,
          month,
          SUM(total) AS total,
          SUM(people_count) AS people_count,
          SUM(virtual_count) AS virtual_count,
          SUM(classic_count) AS classic_count,
          SUM(vip_count) AS vip_count,
          SUM(organization_count) AS organization_count
        FROM monthly_parts
        GROUP BY attraction, month
      ),
      -- A physical round may include both base and promotion payments.
      -- Count finished rounds separately instead of adding report counters.
      monthly_rounds AS (
        SELECT
          zreport.attraction,
          zreport.month,
          COUNT(round.id) AS rounds_count
        FROM confirmed_zreports AS zreport
        INNER JOIN attraction_reports AS xreport
          ON xreport.zreport = zreport.id
          AND xreport.attraction = zreport.attraction
          AND xreport.report_type = :xreportType
        INNER JOIN attraction_rounds AS round
          ON round.report = xreport.id
          AND round.attraction = zreport.attraction
          AND round.status = :finishedStatus
          AND round.deleted_at IS NULL
        GROUP BY zreport.attraction, zreport.month
      )
      SELECT
        totals.attraction::TEXT AS attraction_id,
        totals.month,
        totals.total::TEXT AS total,
        COALESCE(rounds.rounds_count, 0)::TEXT AS rounds_count,
        totals.people_count::TEXT AS people_count,
        totals.virtual_count::TEXT AS virtual_count,
        totals.classic_count::TEXT AS classic_count,
        totals.vip_count::TEXT AS vip_count,
        totals.organization_count::TEXT AS organization_count
      FROM monthly_totals AS totals
      LEFT JOIN monthly_rounds AS rounds
        ON rounds.attraction = totals.attraction AND rounds.month = totals.month
      ORDER BY totals.attraction ASC, totals.month ASC
    `,
    {
      replacements: {
        reportType: AttractionReportTypes.ZREPORT,
        reportStatus: AttractionReportStatusTypes.CONFIRMED,
        xreportType: AttractionReportTypes.XREPORT,
        vipCardType: CardType.VIP,
        paymentType: CardTransactionType.PAYMENT,
        successStatus: CardTransactionStatusTypes.SUCCESS,
        finishedStatus: AttractionRoundStatusTypes.FINISHED,
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

  const attractionWhere: any = {
    [Op.and]: [
      historicalAttractionIDs.length
        ? {
            [Op.or]: [
              { deletedAt: null },
              { id: { [Op.in]: historicalAttractionIDs } },
            ],
          }
        : { deletedAt: null },
      getSoftDeleteVisibilityWhere(startUTC),
    ],
  };

  const attractions = await AttractionModel.findAll({
    paranoid: false,
    attributes: ["id", "name", "price"],
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
      price: attraction.price === null ? null : Number(attraction.price),
    })),
    rows,
  });
};
