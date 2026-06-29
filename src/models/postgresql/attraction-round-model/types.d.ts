declare interface AttractionRoundModelI {
  id: number;
  report: number;
  attraction: number;
  operator: number;
  round_number: number;
  status: import("./enums").AttractionRoundStatusTypes;
  people_count: number;
  offline_count: number;
  online_count: number;
  vip_count: number;
  guest_count: number;
  park_staff_count: number;
  paid_amount: number;
  total_amount: number;
  started_at: Date;
  finished_at: Date | null;
}
