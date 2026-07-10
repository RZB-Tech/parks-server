import { BadRequest, NotFound } from "../../exceptions";
import { CardStatusTypes, CardType } from "../../models/postgresql/cards-model/enums";
import {
  CardBatchModel,
  CardModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { ParseCardExcel, ValidateCardExcel } from "../../utils/excelHelpers";
import {
  CardDTO,
  UpdateCardDTO,
} from "../../dtos/card-dtos/CardDto";
import { col, fn, Op } from "sequelize";

export const GetCardStatsService = async (query: GetCardsQuery) => {
  const batchWhere: Record<string, unknown> = {};
  const cardWhere: Record<string, unknown> = {};

  if (query.type) {
    batchWhere.type = query.type;
    cardWhere.type = query.type;
  }

  if(query.batch) {
    batchWhere.id = Number(query.batch);
    cardWhere.batch = Number(query.batch);
  }

  const [cardBatches, balanceResult] = await Promise.all([
    CardBatchModel.findAll({
      where: batchWhere,
      raw: true,
      order: [["id", "ASC"]],
    }),

    CardModel.findOne({
      where: cardWhere,
      attributes: [[fn("SUM", col("balance")), "total_balance"]],
      raw: true,
    }),
  ]);

  const totalBalance = Number(
    (
      balanceResult as unknown as {
        total_balance: string | number | null;
      }
    )?.total_balance ?? 0,
  );

  const stats = {
    total: 0,
    active: 0,
    inactive: 0,
    blocked: 0,
    lost: 0,
    frozen: 0,
    tethered: 0,

    totalBalance,

    types: {} as Record<string, number>,

    batches: cardBatches.map((batch) => ({
      id: Number(batch.id),
      name: batch.name,
      type: batch.type,
      total: Number(batch.total_cards || 0),
    })),
  };

  for (const batch of cardBatches) {
    stats.total += Number(batch.total_cards || 0);
    stats.active += Number(batch.active_cards || 0);
    stats.inactive += Number(batch.inactive_cards || 0);
    stats.blocked += Number(batch.blocked_cards || 0);
    stats.lost += Number(batch.lost_cards || 0);
    stats.frozen += Number(batch.frozen_cards || 0);
    stats.tethered += Number(batch.tethered_cards || 0);

    const type = String(batch.type);

    stats.types[type] =
      Number(stats.types[type] || 0) + Number(batch.total_cards || 0);
  }

  return stats;
};

export const GetCardsService = async (query: GetCardsQuery) => {
  const where: any = {};

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  if (query.batch) {
    where.batch = Number(query.batch);
  }
  if (query.type) {
    where.type = query.type;
  }

  if (query.search) {
    where[Op.or] = [
      {
        card: { [Op.iLike]: `%${query.search}%` },
      },
      {
        nfc: { [Op.iLike]: `%${query.search}%` },
      },
    ];
  }

  if (query.statuses) {
    where.status = Array.isArray(query.statuses)
      ? { [Op.in]: query.statuses }
      : query.statuses;
  }

  const { rows, count } = await CardModel.findAndCountAll({
    where,
    include: [
      {
        model: CardBatchModel,
        as: "batches",
        required: false,
        attributes: ["id", "name"],
      },
    ],
    limit,
    offset,
    order: [["id", "ASC"]],
  });

  const cards = rows.map((r) => r.get({ plain: true }));

  return {
    cards: cards.map(CardDTO),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

export const CreateCardsService = async (employeeID: number, data: UploadCardsFromFile) => {
  if (!data.file) {
    throw BadRequest("Excel file is required.");
  }

  if (!data.batch_name || !data.batch_name.trim()) {
    throw BadRequest("Batch name is required.");
  }

  if (!data.type) {
    throw BadRequest("Card type is required.");
  }

  const allowedCardTypes = Object.values(CardType);

  if (!allowedCardTypes.includes(data.type)) {
    throw BadRequest("Invalid card type.");
  }

  const isOrganizationCard = data.type === CardType.ORGANIZATION;

  if (
    isOrganizationCard &&
    (data.balance === undefined || data.balance === null)
  ) {
    throw BadRequest("Balance is required for organization cards.");
  }

  if (
    !isOrganizationCard &&
    data.balance !== undefined &&
    data.balance !== null
  ) {
    throw BadRequest("Balance is only allowed for organization cards.");
  }

  let balance = 0;

  if (isOrganizationCard) {
    balance = Number(data.balance);

    if (Number.isNaN(balance)) {
      throw BadRequest("Balance is invalid.");
    }

    if (balance < 0) {
      throw BadRequest("Balance cannot be negative.");
    }

    if (!Number.isInteger(balance)) {
      throw BadRequest("Balance must be an integer.");
    }
  }

  const rows = ParseCardExcel(data.file);

  ValidateCardExcel(rows);

  try {
    return await sequelize.transaction(async (transaction) => {
      const now = new Date();

      const cardStatus = isOrganizationCard
        ? CardStatusTypes.ACTIVE
        : CardStatusTypes.INACTIVE;

      const batch = await CardBatchModel.create(
        {
          name: data.batch_name.trim(),
          type: data.type,
          total_cards: rows.length,
          active_cards: isOrganizationCard ? rows.length : 0,
          inactive_cards: isOrganizationCard ? 0 : rows.length,
          imported_by: employeeID,
          imported_at: now,
        },
        {
          transaction,
        },
      );

      await CardModel.bulkCreate(
        rows.map((row) => ({
          batch: batch.id,
          card: row.card_id.trim(),
          nfc: row.nfc_id.trim(),
          type: data.type,
          balance: isOrganizationCard ? balance : 0,
          status: cardStatus,
          imported_at: now,
          activated_at: isOrganizationCard ? now : null,
        })),
        {
          transaction,
        },
      );

      return {
        batch: {
          id: batch.id,
          name: batch.name,
        },
        imported: rows.length,
      };
    });
  } catch (error) {
    throw BadRequest("Some cards or NFC IDs already exist.");
  }
};

const CARD_BATCH_COUNTER = {
  [CardStatusTypes.INACTIVE]: "inactive_cards",
  [CardStatusTypes.ACTIVE]: "active_cards",
  [CardStatusTypes.FROZEN]: "frozen_cards",
  [CardStatusTypes.BLOCKED]: "blocked_cards",
  [CardStatusTypes.LOST]: "lost_cards",
} as const;

export const UpdateCardsService = async (
  params: CardsParams,
  body: UpdateCardsData,
) => {
  return sequelize.transaction(async (transaction) => {
    const card = await CardModel.findByPk(params.cardID);
    console.log(card)

    if (card == null) throw NotFound("Card not found");

    if (card.status === body.status) {
      return UpdateCardDTO(card.get());
    }

    const batch = await CardBatchModel.findByPk(card.batch, {
      transaction,
    });

    if (!batch) {
      throw NotFound("Card batch not found");
    }
    const oldStatus = card.status as CardStatusTypes;
    const newStatus = body.status as CardStatusTypes;

    const oldField = CARD_BATCH_COUNTER[oldStatus];
    const newField = CARD_BATCH_COUNTER[newStatus];

    await batch.decrement(oldField, { by: 1, transaction });
    await batch.increment(newField, { by: 1, transaction });

    await card.update(
      {
        status: body.status,
      },
      {
        transaction,
      },
    );

    const cardData = card.get();
    return UpdateCardDTO(cardData);
  });
};

export const DeleteCardsService = async (body: DeleteCardsData) => {
  const transaction = await sequelize.transaction();

  try {
    const cards = await CardModel.findAll({
      where: {
        id: {
          [Op.in]: body.cardIDs,
        },
      },
      transaction,
    });

    if (!cards.length) return;

    const batchId = cards[0].batch;
    const statusCountMap: Record<string, number> = {};

    for (const card of cards) {
      const status = card.status;
      statusCountMap[status] = (statusCountMap[status] || 0) + 1;
    }

    await CardModel.destroy({
      where: {
        id: {
          [Op.in]: body.cardIDs,
        },
      },
      force: true,
      transaction,
    });

    await CardBatchModel.decrement("total_cards", {
      by: cards.length,
      where: { id: batchId },
      transaction,
    });

    for (const status in statusCountMap) {
      const field =
        CARD_BATCH_COUNTER[status as keyof typeof CARD_BATCH_COUNTER];

      await CardBatchModel.decrement(field, {
        by: statusCountMap[status],
        where: { id: batchId },
        transaction,
      });
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
