import {
  OnlinePaymentDailyReportDTOInput,
  OnlinePaymentDailyReportResponseDTO,
} from "./types";

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

  return {
    date: data.date,
    timezone: "Asia/Tashkent",
    z_report: data.report
      ? {
          id: Number(data.report.id),
          status: data.report.status,
          opened_at: data.report.opened_at.toISOString(),
          closed_at: data.report.closed_at?.toISOString() ?? null,
        }
      : null,
    payments: {
      total_amount: Number(data.report?.total_amount || 0),
      uzum_amount: Number(data.report?.uzum_amount || 0),
      click_amount: Number(data.report?.click_amount || 0),
      payme_amount: Number(data.report?.payme_amount || 0),
      oneqr_amount: Number(data.report?.oneqr_amount || 0),
    },
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
