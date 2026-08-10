declare interface GetAuditLogsQuery {
  employee_id?: number;
  role?: string;
  action?: import("../../models/postgresql/audit-log-model/enums").AuditActionTypes;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}
