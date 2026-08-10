export const AuditLogDTO = (item: AuditLogModelI): AuditLogResponseDTO => ({
  id: Number(item.id),
  employee: {
    id: item.employee_id == null ? null : Number(item.employee_id),
    name: item.employee_name,
    role: item.employee_role,
  },
  action: item.action,
  entity_type: item.entity_type,
  entity_id: item.entity_id,
  old_values: item.old_values,
  new_values: item.new_values,
  route: item.route,
  method: item.method,
  ip_address: item.ip_address,
  user_agent: item.user_agent,
  created_at: item.created_at,
});
