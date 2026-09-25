import { Op } from "sequelize";

export const getSoftDeleteVisibilityWhere = (periodStart?: Date) => {
  if (!periodStart) {
    return { deletedAt: null };
  }

  return {
    [Op.or]: [
      { deletedAt: null },
      { deletedAt: { [Op.gte]: periodStart } },
    ],
  };
};

export const getDeletedAt = (entity: object): Date | null => {
  const data = entity as Record<string, unknown>;
  const value = data.deletedAt ?? data.deleted_at;

  if (!value) return null;

  const deletedAt = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(deletedAt.getTime()) ? null : deletedAt;
};

export const isVisibleAt = (entity: object, instant: Date) => {
  const deletedAt = getDeletedAt(entity);

  return deletedAt === null || deletedAt.getTime() >= instant.getTime();
};
