declare interface AuditLogResponseDTO {
  id: number;
  employee: {
    id: number | null;
    name: string;
    role: string;
  };
  action: import("../../models/postgresql/audit-log-model/enums").AuditActionTypes;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  route: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

declare interface AuditLogsPaginationResponseDTO {
  audit_logs: AuditLogResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
