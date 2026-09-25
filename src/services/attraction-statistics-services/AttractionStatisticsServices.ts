import { Op } from "sequelize";
import { BadRequest } from "../../exceptions";
import { AttractionModel } from "../../models/postgresql/attraction-model/AttractionModel";
import { AttractionReportTypes } from "../../models/postgresql/attraction-model/enums";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportStatusTypes } from "../../models/postgresql/attraction-report-model/enums";
import { PromotionReportModel } from "../../models/postgresql/promotion-reports-model/PromotionReportsModel";
import { getAccountingDateRange, getTashkentDateOnly } from "../../utils/date";

type StatisticsDateRange = {
  start: Date;
  end: Date;
};

type StatisticsFilter = {
  date: string | null;
  from: string;
  to: string;
  timezone: "Asia/Tashkent";
};

type AttractionTotals = {
  rounds_count: number;
  people_count: number;
  refund_count: number;
  offline_people_count: number;
  online_people_count: number;
  total_amount: number;
  revenue_amount: number;
};

const emptyTotals = (): AttractionTotals => ({
  rounds_count: 0,
  people_count: 0,
  refund_count: 0,
  offline_people_count: 0,
  online_people_count: 0,
  total_amount: 0,
  revenue_amount: 0,
});

const roundPercentage = (amount: number, total: number) => {
  if (total <= 0) return 0;

  return Number(((amount / total) * 100).toFixed(2));
};

const getDateRange = (
  query: GetAttractionStatisticsQuery,
): StatisticsDateRange => {
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
  query: GetAttractionStatisticsQuery,
  range: StatisticsDateRange,
): StatisticsFilter => {
  const defaultDate = getTashkentDateOnly(range.start);

  if (query.date) {
    return {
      date: query.date,
      from: query.date,
      to: query.date,
      timezone: "Asia/Tashkent",
    };
  }

  return {
    date: null,
    from: query.from ?? defaultDate,
    to: query.to ?? defaultDate,
    timezone: "Asia/Tashkent",
  };
};

const addAttractionReportTotals = (
  target: AttractionTotals,
  report: AttractionReportModelI,
) => {
  target.rounds_count += Number(report.total_rounds || 0);
  target.people_count += Number(report.total_people || 0);
  target.refund_count += Number(report.refund_count || 0);
  target.offline_people_count += Number(report.total_offline || 0);
  target.online_people_count += Number(report.total_online || 0);
  target.total_amount += Number(report.total_amount || 0);
  target.revenue_amount += Number(report.paid_amount || 0);
};

const addPromotionReportTotals = (
  target: AttractionTotals,
  report: PromotionReportModelI,
) => {
  target.rounds_count += Number(report.rounds_count || 0);
  target.people_count += Number(report.total_people || 0);
  target.refund_count += Number(report.refund_count || 0);
  target.offline_people_count += Number(report.total_offline || 0);
  target.online_people_count += Number(report.total_online || 0);
  target.total_amount += Number(report.total_amount || 0);
  target.revenue_amount += Number(report.paid_amount || 0);
};

const getAttractionsForStatistics = async (attractionIDs: number[]) => {
  const where: any = attractionIDs.length
    ? {
        [Op.or]: [
          { deletedAt: null },
          { id: { [Op.in]: attractionIDs } },
        ],
      }
    : { deletedAt: null };

  return AttractionModel.findAll({
    paranoid: false,
    where,
    order: [["id", "ASC"]],
  });
};

export const GetAttractionStatisticsService = async (
  query: GetAttractionStatisticsQuery,
) => {
  const range = getDateRange(query);

  const reports = await AttractionReportModel.findAll({
    where: {
      report_type: AttractionReportTypes.ZREPORT,
      status: AttractionReportStatusTypes.CONFIRMED,
      createdAt: {
        [Op.between]: [range.start, range.end],
      },
    },
    order: [
      ["attraction", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  const reportIDs = reports.map((report) => Number(report.id));

  const promotionReports = reportIDs.length
    ? await PromotionReportModel.findAll({
        where: {
          zreport: {
            [Op.in]: reportIDs,
          },
        },
      })
    : [];

  const attractionIDs = [
    ...new Set([
      ...reports.map((report) => Number(report.attraction)),
      ...promotionReports.map((report) => Number(report.attraction)),
    ]),
  ].filter((id) => Number.isInteger(id) && id > 0);

  const attractions = await getAttractionsForStatistics(attractionIDs);
  const totalsByAttraction = new Map<number, AttractionTotals>();

  for (const report of reports) {
    const attractionID = Number(report.attraction);
    const totals = totalsByAttraction.get(attractionID) ?? emptyTotals();

    addAttractionReportTotals(
      totals,
      report.get({ plain: true }) as AttractionReportModelI,
    );
    totalsByAttraction.set(attractionID, totals);
  }

  for (const report of promotionReports) {
    const attractionID = Number(report.attraction);
    const totals = totalsByAttraction.get(attractionID) ?? emptyTotals();

    addPromotionReportTotals(
      totals,
      report.get({ plain: true }) as PromotionReportModelI,
    );
    totalsByAttraction.set(attractionID, totals);
  }

  const totals = emptyTotals();

  for (const attractionTotals of totalsByAttraction.values()) {
    totals.rounds_count += attractionTotals.rounds_count;
    totals.people_count += attractionTotals.people_count;
    totals.refund_count += attractionTotals.refund_count;
    totals.offline_people_count += attractionTotals.offline_people_count;
    totals.online_people_count += attractionTotals.online_people_count;
    totals.total_amount += attractionTotals.total_amount;
    totals.revenue_amount += attractionTotals.revenue_amount;
  }

  return {
    filter: getFilter(query, range),
    totals: {
      ...totals,
      offline_percentage: roundPercentage(
        totals.offline_people_count,
        totals.people_count,
      ),
      online_percentage: roundPercentage(
        totals.online_people_count,
        totals.people_count,
      ),
    },
    attractions: attractions.map((attraction) => {
      const attractionTotals =
        totalsByAttraction.get(Number(attraction.id)) ?? emptyTotals();

      return {
        attraction_id: Number(attraction.id),
        attraction_name: attraction.name,
        revenue_amount: attractionTotals.revenue_amount,
        total_amount: attractionTotals.total_amount,
        revenue_percentage: roundPercentage(
          attractionTotals.revenue_amount,
          totals.revenue_amount,
        ),
        rounds_count: attractionTotals.rounds_count,
        people_count: attractionTotals.people_count,
        offline_people_count: attractionTotals.offline_people_count,
        online_people_count: attractionTotals.online_people_count,
        offline_percentage: roundPercentage(
          attractionTotals.offline_people_count,
          attractionTotals.people_count,
        ),
        online_percentage: roundPercentage(
          attractionTotals.online_people_count,
          attractionTotals.people_count,
        ),
        refund_count: attractionTotals.refund_count,
      };
    }),
  };
};
