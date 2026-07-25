import { Op } from "sequelize";
import { BadRequest, NotFound } from "../../../exceptions";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import {
  AttractionModel,
  AttractionRoundModel,
  UserModel,
} from "../../../plugins/db/postgresql/db";
import { AttractionStatusTypes } from "../../../models/postgresql/attraction-model/enums";
import {
  AttractionLastRoundDTO,
  ClientAttractionDTO,
} from "../../../dtos/client/attraction-dtos/AttractionDto";
import {
  FindBestActivePromotionForAttractionService,
  FindBestActivePromotionsForAttractionsService,
} from "../../promotion-services/PromotionServices";

export const GetClientAttractionsService = async (
  telegramID: number,
): Promise<ClientAttractionResponseDTO[]> => {
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

  const attractions = await AttractionModel.findAll({
    where: {
      status: {
        [Op.notIn]: [
          AttractionStatusTypes.MAINTENANCE,
          AttractionStatusTypes.CLOSED,
        ],
      },
    },

    order: [["name", "ASC"]],
  });

  const promotions = await FindBestActivePromotionsForAttractionsService(
    attractions.map((attraction) => Number(attraction.id)),
  );

  return attractions.map((attraction) =>
    ClientAttractionDTO(
      attraction,
      promotions.get(Number(attraction.id)) ?? null,
    ),
  );
};

export const GetAttractionRoundService = async (
  telegramID: number,
  params: GetAttractionRoundParams,
): Promise<AttractionLastRoundResponseDTO> => {
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

  const attractionID = Number(params.attractionID);

  if (!attractionID || Number.isNaN(attractionID)) {
    throw BadRequest("INVALID_ATTRACTION_ID");
  }

  const attraction = await AttractionModel.findOne({
    where: {
      id: attractionID,
      status: {
        [Op.notIn]: [
          AttractionStatusTypes.MAINTENANCE,
          AttractionStatusTypes.CLOSED,
        ],
      },
    },
  });

  if (!attraction) {
    throw BadRequest("ATTRACTION_NOT_FOUND");
  }

  const [lastRound, promotion] = await Promise.all([
    AttractionRoundModel.findOne({
      where: {
        attraction: attractionID,
      },
      order: [
        ["round_number", "DESC"],
        ["id", "DESC"],
      ],
    }),
    FindBestActivePromotionForAttractionService(attractionID),
  ]);

  return AttractionLastRoundDTO({
    attraction,
    lastRound,
    promotion,
  });
};
