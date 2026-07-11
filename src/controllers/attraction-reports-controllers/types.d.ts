declare interface AttractionReportParams {
  attractionID: number;
  reportID?: number;
}

declare interface AttractionReportHeaders {
  authorization: string;
  "device-id": string;
}

declare interface UpdateAttractionReportStatusData {
  status:
    | AttractionReportStatusTypes.STOPPED
    | AttractionReportStatusTypes.CLOSED;

  description: string;
}

declare interface GetAttractionZReportsQuery {
  date?: string;
}

declare interface ConfirmAttractionZReportItemData {
  id: number;
  status:
    | AttractionReportStatusTypes.CONFIRMED
    | AttractionReportStatusTypes.CANCELLED;
}

declare interface ConfirmAttractionZReportsData {
  zreports: ConfirmAttractionZReportItemData[];
}

declare type GetAccountingAttractionReportsQuery = {
  date?: string;
  start_date?: string;
  end_date?: string;
};
