import { AutoCloseUnclosedAttractionReportsService } from "../../services/attraction-reports-services/AttractionReportsServices";

export const closeUnclosedAttractionReportsActivity = async (
  referenceTime: string,
) => {
  return await AutoCloseUnclosedAttractionReportsService(referenceTime);
};
