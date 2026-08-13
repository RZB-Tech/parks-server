import { AutoCloseUnclosedXReportsService } from "../../services/cashbox-reports-services/CashboxReportsServices";
import {
  CloseOnlineDailyZReportService,
  OpenOnlineDailyZReportService,
} from "../../services/payment-services/OnlinePaymentReportServices";

export const closeUnclosedXReportsActivity = async (referenceTime: string) => {
  return await AutoCloseUnclosedXReportsService(referenceTime);
};

export const closeOnlineDailyZReportActivity = async (
  referenceTime: string,
) => {
  return await CloseOnlineDailyZReportService(referenceTime);
};

export const openOnlineDailyZReportActivity = async (referenceTime: string) => {
  return await OpenOnlineDailyZReportService(referenceTime);
};
