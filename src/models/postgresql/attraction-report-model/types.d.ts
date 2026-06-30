declare interface AttractionReportModelI {
  id: number;
  attraction: number;
  operator: number;
  status: import("./enums").AttractionReportStatusTypes;
  opened_at: Date;
  stopped_at: Date | null;
  closed_at: Date | null;
  confirmed_at: Date | null;
  confirmed_by: number | null;
  total_rounds: number;
  total_people: number;
  total_offline: number;
  total_online: number;
  total_vip: number;
  total_guest: number;
  total_park_staff: number;
  paid_amount: number;
  total_amount: number;
  createdAt?: Date;
}
