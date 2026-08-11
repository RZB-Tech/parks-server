import { AutoCloseUnclosedXReportsService } from "../../services/cashbox-reports-services/CashboxReportsServices";

export const closeUnclosedXReportsActivity = async (referenceTime: string) => {
  return await AutoCloseUnclosedXReportsService(referenceTime);
};

// Keep these legacy activity names registered until old workflow runs have
// drained. Online Z-report lifecycle is now handled by the cashbox app.
export const closeOnlineDailyZReportActivity = async (
  _referenceTime: string,
) => {
  return {
    skipped: true,
    reason: "MOVED_TO_CASHBOX_APP",
  };
};

export const openOnlineDailyZReportActivity = async (_referenceTime: string) => {
  return {
    skipped: true,
    reason: "MOVED_TO_CASHBOX_APP",
  };
};
