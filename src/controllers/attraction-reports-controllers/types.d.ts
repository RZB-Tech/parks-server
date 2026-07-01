declare interface AttractionReportParams {
  attractionID: number;
}

declare interface UpdateAttractionReportStatusData {
  status:
    | AttractionReportStatusTypes.STOPPED
    | AttractionReportStatusTypes.CLOSED;
}

declare interface GetAttractionZReportsQuery {
  date?: string;
}
