declare interface SosParams {
  source: "attraction" | "cashbox";
  sourceID: string;
}

declare interface CreateSOSData {
  description: string;
}

declare interface GetSOSReportsQuery {
  page?: string;
  limit?: string;
  source?: "attraction" | "cashbox";
  search?: string;
}

declare interface GetSOSReportParams {
  sosID: string;
}
