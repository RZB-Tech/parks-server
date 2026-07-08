import { AutoCloseUnclosedAttractionReportsService } from "../../services/attraction-reports-services/AttractionReportsServices";

export const closeUnclosedAttractionReportsActivity = async () => {
  return await AutoCloseUnclosedAttractionReportsService();
};
