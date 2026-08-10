import { Model, Sequelize, Transaction } from "sequelize";
import { AuditLogModel } from "../../../models/postgresql/audit-log-model/AuditLogModel";
import { AuditActionTypes } from "../../../models/postgresql/audit-log-model/enums";
import { GetAuditRequest } from "../../../utils/auditContext";

const AUDIT_STATE = Symbol("auditState");
const IGNORED_FIELDS = new Set([
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
  "deleted_at",
  "deletedAt",
]);
const SENSITIVE_FIELD_PATTERN =
  /(^|_)(password|access_token|refresh_token|token|secret|fingerprint|authorization|cookie|otp|pin|cvv)($|_)/i;

type PlainRecord = Record<string, unknown>;
type CapturedRow = {
  id: string | null;
  values: PlainRecord;
};
type HookOptions = {
  transaction?: Transaction | null;
  model?: any;
  where?: unknown;
  attributes?: PlainRecord;
  individualHooks?: boolean;
  [AUDIT_STATE]?: CapturedRow[];
};

const isAuditModel = (model: any) =>
  model === AuditLogModel || model?.tableName === "audit_logs";

const getEntityType = (model: any): string => {
  const tableName = model?.getTableName?.() ?? model?.tableName ?? model?.name;

  if (typeof tableName === "object" && tableName !== null) {
    return String(tableName.tableName ?? model?.name ?? "unknown");
  }

  return String(tableName ?? "unknown");
};

const getEntityID = (instance: Model): string | null => {
  const model = instance.constructor as typeof Model;
  const primaryKey = model.primaryKeyAttribute || "id";
  const id = instance.get(primaryKey as any);

  return id == null ? null : String(id);
};

const normalizeValue = (value: unknown): unknown => {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (Array.isArray(value)) return value.map(normalizeValue);

  if (typeof value === "object") {
    return sanitizeRecord(value as PlainRecord);
  }

  return String(value);
};

export const sanitizeRecord = (input: PlainRecord): PlainRecord =>
  Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !IGNORED_FIELDS.has(key))
      .map(([key, value]) => [
        key,
        SENSITIVE_FIELD_PATTERN.test(key) ? "[REDACTED]" : normalizeValue(value),
      ]),
  );

const plainInstance = (instance: Model): PlainRecord =>
  sanitizeRecord(instance.get({ plain: true }) as PlainRecord);

const captureRows = async (options: HookOptions): Promise<CapturedRow[]> => {
  const model = options.model;

  if (!model || isAuditModel(model)) return [];

  const primaryKey = model.primaryKeyAttribute || "id";
  const rows = await model.findAll({
    where: options.where,
    transaction: options.transaction,
    paranoid: false,
  });

  return rows.map((row: Model) => {
    const id = row.get(primaryKey);

    return {
      id: id == null ? null : String(id),
      values: plainInstance(row),
    };
  });
};

const currentAuditData = () => {
  const request = GetAuditRequest();
  const employee = request?.employee;

  if (!request || !employee) return null;

  const userAgent = request.headers["user-agent"];

  return {
    employee_id: employee.id,
    employee_name: [employee.firstname, employee.lastname]
      .filter(Boolean)
      .join(" ") || `Employee #${employee.id}`,
    employee_role: employee.role_name || String(employee.role_id),
    route: request.routeOptions?.url || request.url || null,
    method: request.method || null,
    ip_address: request.ip || null,
    user_agent: Array.isArray(userAgent) ? userAgent.join(", ") : userAgent || null,
  };
};

const writeAuditLog = async (
  action: AuditActionTypes,
  entityType: string,
  entityID: string | null,
  oldValues: PlainRecord | null,
  newValues: PlainRecord | null,
  transaction?: Transaction | null,
) => {
  const requestData = currentAuditData();

  if (!requestData || entityType === "audit_logs") return;

  // If an employee deletes their own account, the FK target no longer exists
  // when the after-destroy hook runs. The name and role snapshot still retain
  // the actor identity in that edge case.
  const employeeID =
    action === AuditActionTypes.DELETE &&
    entityType === "employees" &&
    entityID === String(requestData.employee_id)
      ? null
      : requestData.employee_id;

  await AuditLogModel.create(
    {
      ...requestData,
      employee_id: employeeID,
      action,
      entity_type: entityType,
      entity_id: entityID,
      old_values: oldValues,
      new_values: newValues,
    },
    { transaction: transaction ?? undefined, hooks: false },
  );
};

const changedValues = (instance: Model) => {
  const changed = instance.changed();
  const fields = (Array.isArray(changed) ? changed : []).filter(
    (field) => !IGNORED_FIELDS.has(field),
  );
  const oldValues: PlainRecord = {};
  const newValues: PlainRecord = {};

  for (const field of fields) {
    oldValues[field] = normalizeValue(instance.previous(field));
    newValues[field] = normalizeValue(instance.get(field));
  }

  return {
    oldValues: sanitizeRecord(oldValues),
    newValues: sanitizeRecord(newValues),
  };
};

export const registerAuditHooks = (sequelize: Sequelize) => {
  sequelize.addHook("afterCreate", "auditAfterCreate", async (instance: Model, options: HookOptions) => {
    const model = instance.constructor as typeof Model;

    if (isAuditModel(model)) return;

    await writeAuditLog(
      AuditActionTypes.CREATE,
      getEntityType(model),
      getEntityID(instance),
      null,
      plainInstance(instance),
      options.transaction,
    );
  });

  sequelize.addHook("afterUpdate", "auditAfterUpdate", async (instance: Model, options: HookOptions) => {
    const model = instance.constructor as typeof Model;

    if (isAuditModel(model)) return;

    const { oldValues, newValues } = changedValues(instance);

    if (Object.keys(newValues).length === 0) return;

    await writeAuditLog(
      AuditActionTypes.UPDATE,
      getEntityType(model),
      getEntityID(instance),
      oldValues,
      newValues,
      options.transaction,
    );
  });

  sequelize.addHook("afterDestroy", "auditAfterDestroy", async (instance: Model, options: HookOptions) => {
    const model = instance.constructor as typeof Model;

    if (isAuditModel(model)) return;

    await writeAuditLog(
      AuditActionTypes.DELETE,
      getEntityType(model),
      getEntityID(instance),
      plainInstance(instance),
      null,
      options.transaction,
    );
  });

  sequelize.addHook("afterBulkCreate", "auditAfterBulkCreate", async (instances: Model[], options: HookOptions) => {
    if (options.individualHooks) return;

    for (const instance of instances) {
      const model = instance.constructor as typeof Model;

      if (isAuditModel(model)) continue;

      await writeAuditLog(
        AuditActionTypes.CREATE,
        getEntityType(model),
        getEntityID(instance),
        null,
        plainInstance(instance),
        options.transaction,
      );
    }
  });

  sequelize.addHook("beforeBulkUpdate", "auditBeforeBulkUpdate", async (options: HookOptions) => {
    if (!currentAuditData() || isAuditModel(options.model)) return;
    options[AUDIT_STATE] = await captureRows(options);
  });

  sequelize.addHook("afterBulkUpdate", "auditAfterBulkUpdate", async (options: HookOptions) => {
    const model = options.model;
    const captured = options[AUDIT_STATE] || [];

    if (!model || isAuditModel(model) || captured.length === 0) return;

    const primaryKey = model.primaryKeyAttribute || "id";
    const updatedFields = Object.keys(options.attributes || {}).filter(
      (field) => !IGNORED_FIELDS.has(field),
    );

    for (const oldRow of captured) {
      const current = oldRow.id == null
        ? null
        : await model.findByPk(oldRow.id, {
            transaction: options.transaction,
            paranoid: false,
          });

      if (!current) continue;

      const currentValues = plainInstance(current);
      const oldValues: PlainRecord = {};
      const newValues: PlainRecord = {};

      for (const field of updatedFields) {
        if (field === primaryKey) continue;

        const previous = oldRow.values[field];
        const next = currentValues[field];

        if (JSON.stringify(previous) !== JSON.stringify(next)) {
          oldValues[field] = previous;
          newValues[field] = next;
        }
      }

      if (Object.keys(newValues).length === 0) continue;

      await writeAuditLog(
        AuditActionTypes.UPDATE,
        getEntityType(model),
        oldRow.id,
        oldValues,
        newValues,
        options.transaction,
      );
    }
  });

  sequelize.addHook("beforeBulkDestroy", "auditBeforeBulkDestroy", async (options: HookOptions) => {
    if (!currentAuditData() || isAuditModel(options.model)) return;
    options[AUDIT_STATE] = await captureRows(options);
  });

  sequelize.addHook("afterBulkDestroy", "auditAfterBulkDestroy", async (options: HookOptions) => {
    const model = options.model;

    if (!model || isAuditModel(model) || options.individualHooks) return;

    for (const oldRow of options[AUDIT_STATE] || []) {
      await writeAuditLog(
        AuditActionTypes.DELETE,
        getEntityType(model),
        oldRow.id,
        oldRow.values,
        null,
        options.transaction,
      );
    }
  });
};
