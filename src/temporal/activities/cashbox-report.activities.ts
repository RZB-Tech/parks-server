import { AutoCloseUnclosedXReportsService } from "../../services/cashbox-reports-services/CashboxReportsServices";
import {
  CloseOnlineDailyZReportService,
  OpenOnlineDailyZReportService,
} from "../../services/payment-services/OnlinePaymentReportServices";

export const closeUnclosedXReportsActivity = async () => {
  return await AutoCloseUnclosedXReportsService();
};

export const closeOnlineDailyZReportActivity = async () => {
  return await CloseOnlineDailyZReportService();
};

export const openOnlineDailyZReportActivity = async () => {
  return await OpenOnlineDailyZReportService();
};
