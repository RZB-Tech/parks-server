import { MultipartFile, MultipartValue } from "@fastify/multipart";
import { BadRequest, NotFound } from "../../exceptions";
import { CardStatusTypes } from "../../models/postgresql/cards-model/enums";
import {
  CardBatchModel,
  CardModel,
  sequelize,
} from "../../plugins/db/postgresql/db";
import { ParseCardExcel, ValidateCardExcel } from "../../utils/excelHelpers";
import {
  CardDTO,
  CardStatsDTO,
  UpdateCardDTO,
} from "../../dtos/card-dtos/CardDto";
import { Op } from "sequelize";

export const GetCardStatsService = async () => {
  const cardBatches = await CardBatchModel.findAll({
    raw: true,
  });

  return cardBatches.map((cardStats) => CardStatsDTO(cardStats));
};

export const GetCardsService = async (query: GetCardsQuery) => {
  const where: any = {};

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  if (query.batch) {
    where.batch = Number(query.batch);
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

export const CreateCardsService = async (data: UploadCardsFromFile) => {
  if (!data.file) {
    throw BadRequest("Excel file is required.");
  }

  if (!data.batch_name || !data.batch_name.trim()) {
    throw BadRequest("Batch name is required.");
  }

  const rows = ParseCardExcel(data.file);

  ValidateCardExcel(rows);

  try {
    return await sequelize.transaction(async (transaction) => {
      const now = new Date();

      const batch = await CardBatchModel.create(
        {
          name: data.batch_name,
          total_cards: rows.length,
          inactive_cards: rows.length,
          imported_by: 4,
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
          status: CardStatusTypes.INACTIVE,
          imported_at: now,
          activated_at: null,
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
    if (error) {
      throw BadRequest("Some cards or NFC IDs already exist.");
    }

    throw error;
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
