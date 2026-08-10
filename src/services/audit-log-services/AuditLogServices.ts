import { Op } from "sequelize";
import { AuditLogModel } from "../../models/postgresql/audit-log-model/AuditLogModel";
import { AuditLogDTO } from "../../dtos/audit-log-dtos/AuditLogDto";

const parseStartDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00+05:00`)
    : new Date(date);

const parseExclusiveEndDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date);

  const result = new Date(`${date}T00:00:00+05:00`);
  result.setUTCDate(result.getUTCDate() + 1);

  return result;
};

export const GetAuditLogsService = async (
  query: GetAuditLogsQuery,
): Promise<AuditLogsPaginationResponseDTO> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;
  const where: Record<string | symbol, unknown> = {};

  if (query.employee_id) where.employee_id = query.employee_id;
  if (query.role) where.employee_role = query.role;
  if (query.action) where.action = query.action;
  if (query.entity_type) where.entity_type = query.entity_type;
  if (query.entity_id) where.entity_id = String(query.entity_id);

  if (query.date_from || query.date_to) {
    const createdAt: Record<symbol, Date> = {};

    if (query.date_from) createdAt[Op.gte] = parseStartDate(query.date_from);
    if (query.date_to) createdAt[Op.lt] = parseExclusiveEndDate(query.date_to);

    where.created_at = createdAt;
  }

  const { rows, count } = await AuditLogModel.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  return {
    audit_logs: rows.map((row) =>
      AuditLogDTO(row.get({ plain: true }) as AuditLogModelI),
    ),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};
