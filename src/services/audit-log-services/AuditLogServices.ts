import { Op, WhereOptions } from "sequelize";
import { Readable } from "node:stream";
import { AuditLogModel } from "../../models/postgresql/audit-log-model/AuditLogModel";
import { AuditLogDTO } from "../../dtos/audit-log-dtos/AuditLogDto";
import { EmployeeModel } from "../../models/postgresql/employees-model/EmployeeModel";
import { RoleModel } from "../../models/postgresql/role-model/RoleModel";
import { RoleTypes } from "../../models/postgresql/role-model/enums";
import { getAuditExportRange } from "../../utils/auditExportRange";

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

const getAuditVisibilityFilters = async (): Promise<WhereOptions[]> => {
  const ownerRole = await RoleModel.findOne({
    attributes: ["id"],
    where: { name: RoleTypes.OWNER },
  });
  const ownerEmployees = ownerRole
    ? await EmployeeModel.findAll({
        attributes: ["id"],
        where: { role: ownerRole.id },
        paranoid: false,
      })
    : [];
  const ownerEmployeeIDs = ownerEmployees.map((employee) =>
    String(employee.id),
  );
  const visibilityFilters: WhereOptions[] = [
    {
      employee_role: {
        [Op.ne]: RoleTypes.OWNER,
      },
    },
  ];

  if (ownerEmployeeIDs.length > 0) {
    visibilityFilters.push({
      [Op.not]: {
        [Op.and]: [
          { entity_type: "employees" },
          { entity_id: { [Op.in]: ownerEmployeeIDs } },
        ],
      },
    });
  }

  return visibilityFilters;
};

export const GetAuditLogsService = async (
  query: GetAuditLogsQuery,
): Promise<AuditLogsPaginationResponseDTO> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;
  const where: Record<string | symbol, unknown> = {
    [Op.and]: await getAuditVisibilityFilters(),
  };

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

const EXPORT_BATCH_SIZE = 500;

export const ExportAuditLogsService = async (query: ExportAuditLogsQuery) => {
  const { start, end } = getAuditExportRange(query);
  const exportedAt = new Date().toISOString();
  const where: WhereOptions = {
    [Op.and]: await getAuditVisibilityFilters(),
    created_at: { [Op.gte]: start, [Op.lt]: end },
  };

  const fetchBatch = (cursor?: AuditLogModel) =>
    AuditLogModel.findAll({
      where: cursor
        ? {
            [Op.and]: [
              where,
              {
                [Op.or]: [
                  { created_at: { [Op.lt]: cursor.created_at } },
                  {
                    created_at: cursor.created_at,
                    id: { [Op.lt]: cursor.id },
                  },
                ],
              },
            ],
          }
        : where,
      limit: EXPORT_BATCH_SIZE,
      order: [["created_at", "DESC"], ["id", "DESC"]],
    });

  // Surface initial database errors before sending download headers.
  const firstBatch = await fetchBatch();

  async function* generateJSON() {
    const metadata = JSON.stringify({
      from: query.from,
      to: query.to,
      exported_at: exportedAt,
    });
    yield `${metadata.slice(0, -1)},"audit_logs":[`;
    let batch = firstBatch;
    let separator = "";

    while (batch.length > 0) {
      for (const row of batch) {
        yield separator + JSON.stringify(AuditLogDTO(row.get({ plain: true })));
        separator = ",";
      }

      if (batch.length < EXPORT_BATCH_SIZE) break;
      batch = await fetchBatch(batch[batch.length - 1]);
    }

    yield "]}";
  }

  return {
    filename: `audit-logs_${query.from.slice(0, 10)}_${query.to.slice(0, 10)}.json`,
    stream: Readable.from(generateJSON(), { objectMode: false }),
  };
};
