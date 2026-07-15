import { QueryTypes, Transaction } from "sequelize";
import { UserCardDTO } from "../../../dtos/client/card-dtos/CardDto";
import { BadRequest } from "../../../exceptions";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import {
  CardBatchModel,
  CardModel,
  UserModel,
} from "../../../plugins/db/postgresql/db";
import {
  CardStatusTypes,
  CardType,
} from "../../../models/postgresql/cards-model/enums";
import {
  GenerateVirtualCardNfc,
  GenerateVirtualCardNumber,
  GetVirtualCardBatchName,
} from "../../../utils/client/VirtualCardsHelpers";

export const GetUserCardsService = async (
  telegramID: number,
): Promise<GetUserCardsResponseDTO> => {
  const user = await UserModel.findOne({
    where: {
      telegram_id: telegramID,
    },
  });

  if (!user) {
    throw BadRequest("USER_NOT_REGISTERED");
  }

  if (
    user.status !== UserStatusTypes.ACTIVE ||
    !user.phone_verified_at ||
    !user.registered_at
  ) {
    throw BadRequest("USER_NOT_VERIFIED");
  }

  const userCards = await CardModel.findAll({
    where: {
      user: user.id,
    },

    order: [["created_at", "DESC"]],
  });

  const cards = userCards.map(UserCardDTO);
  const totalBalance = cards.reduce((total, card) => total + card.balance, 0);

  return {
    cards,
    totalBalance,
  };
};

export const CreateVirtualCardService = async (
  telegramID: number,
): Promise<UserCardResponseDTO> => {
  const sequelize = CardModel.sequelize!;

  return sequelize.transaction(async (transaction: Transaction) => {
    const now = new Date();

    const user = await UserModel.findOne({
      where: {
        telegram_id: telegramID,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      throw BadRequest("USER_NOT_REGISTERED");
    }

    if (
      user.status !== UserStatusTypes.ACTIVE ||
      !user.phone_verified_at ||
      !user.registered_at
    ) {
      throw BadRequest("USER_NOT_VERIFIED");
    }

    const existingVirtualCard = await CardModel.findOne({
      where: {
        user: user.id,
        type: CardType.VIRTUAL,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingVirtualCard) {
      throw BadRequest("USER_ALREADY_HAS_VIRTUAL_CARD");
    }

    const batchName = GetVirtualCardBatchName(now);

    /*
     * Turli userlar parallel virtual card
     * yaratayotganda bir xil batch ikki marta
     * yaratilmasligi uchun PostgreSQL advisory lock.
     */
    await sequelize.query(
      `
          SELECT pg_advisory_xact_lock(
            hashtext(:batchName)
          )
        `,
      {
        replacements: { batchName },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    let batch = await CardBatchModel.findOne({
      where: {
        name: batchName,
        type: CardType.VIRTUAL,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!batch) {
      batch = await CardBatchModel.create(
        {
          name: batchName,
          type: CardType.VIRTUAL,
          total_cards: 0,
          active_cards: 0,
          inactive_cards: 0,
          frozen_cards: 0,
          blocked_cards: 0,
          lost_cards: 0,
          tethered_cards: 0,
          imported_by: null,
          imported_at: now,
        },
        {
          transaction,
        },
      );
    }

    const cardNumber = await GenerateVirtualCardNumber(transaction);
    const nfcNumber = await GenerateVirtualCardNfc(transaction);

    const virtualCard = await CardModel.create(
      {
        user: Number(user.id),
        batch: Number(batch.id),
        card: cardNumber,
        nfc: nfcNumber,
        status: CardStatusTypes.ACTIVE,
        type: CardType.VIRTUAL,
        balance: 0,
        imported_at: now,
        activated_at: now,
      },
      {
        transaction,
      },
    );

    await batch.increment(
      {
        total_cards: 1,
        active_cards: 1,
      },
      { transaction },
    );

    return UserCardDTO(virtualCard);
  });
};
