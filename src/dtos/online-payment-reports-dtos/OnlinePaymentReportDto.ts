import {
  OnlinePaymentDailyReportDTOInput,
  OnlinePaymentDailyReportResponseDTO,
} from "./types";
import { getTashkentDateOnly } from "../../utils/date";

export const OnlinePaymentDailyReportDTO = (
  data: OnlinePaymentDailyReportDTOInput,
): OnlinePaymentDailyReportResponseDTO => {
  const registeredUsersCount = Number(data.registered_users_count || 0);
  const virtualCardsOpenedCount = Number(
    data.virtual_cards_opened_count || 0,
  );
  const registeredUsersWithVirtualCardCount = Number(
    data.registered_users_with_virtual_card_count || 0,
  );
  const bonusPerVirtualCard = Number(data.bonus_per_virtual_card || 0);
  const reports = data.reports.map((report) => ({
    id: Number(report.id),
    date: getTashkentDateOnly(report.report_date),
    status: report.status,
    opened_at: report.opened_at.toISOString(),
    closed_at: report.closed_at?.toISOString() ?? null,
  }));
  const isSingleDay = data.from === data.to;
  const latestSingleDayReport =
    isSingleDay && reports.length > 0 ? reports[reports.length - 1] : null;
  const singleDayReport = latestSingleDayReport
    ? {
        id: latestSingleDayReport.id,
        status: latestSingleDayReport.status,
        opened_at: latestSingleDayReport.opened_at,
        closed_at: latestSingleDayReport.closed_at,
      }
    : null;

  const payments = data.reports.reduce(
    (totals, report) => {
      totals.total_amount += Number(report.total_amount || 0);
      totals.uzum_amount += Number(report.uzum_amount || 0);
      totals.click_amount += Number(report.click_amount || 0);
      totals.payme_amount += Number(report.payme_amount || 0);
      totals.oneqr_amount += Number(report.oneqr_amount || 0);

      return totals;
    },
    {
      total_amount: 0,
      uzum_amount: 0,
      click_amount: 0,
      payme_amount: 0,
      oneqr_amount: 0,
    },
  );

  return {
    date: isSingleDay ? data.from : null,
    from: data.from,
    to: data.to,
    timezone: "Asia/Tashkent",
    z_report: singleDayReport,
    z_reports: reports,
    payments,
    application_stats: {
      registered_users_count: registeredUsersCount,
      virtual_cards_opened_count: virtualCardsOpenedCount,
      registered_users_with_virtual_card_count:
        registeredUsersWithVirtualCardCount,
      registered_users_without_virtual_card_count: Math.max(
        0,
        registeredUsersCount - registeredUsersWithVirtualCardCount,
      ),
      bonus_per_virtual_card: bonusPerVirtualCard,
      total_bonus_amount: virtualCardsOpenedCount * bonusPerVirtualCard,
    },
  };
};
