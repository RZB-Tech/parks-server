import { AutoCloseUnclosedXReportsService } from "../../services/cashbox-reports-services/CashboxReportsServices";


export const closeUnclosedXReportsActivity = async () => {
  return await AutoCloseUnclosedXReportsService();
};
