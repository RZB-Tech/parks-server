declare interface AuditLogModelI {
  id: number;
  employee_id: number | null;
  employee_name: string;
  employee_role: string;
  action: import("./enums").AuditActionTypes;
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

declare type CreateAuditLogModelI = Omit<AuditLogModelI, "id" | "created_at">;
