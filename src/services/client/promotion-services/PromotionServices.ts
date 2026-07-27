import { AttractionModel } from "../../../models/postgresql/attraction-model/AttractionModel";
import { PromotionAttractionModel } from "../../../models/postgresql/promotion-attraction-model/PromotionAttractionModel";
import { PromotionModel } from "../../../models/postgresql/promotion-model/PromotionModel";
import { PromotionStatusTypes } from "../../../models/postgresql/promotion-model/enums";
import { ClientPromotionDTO } from "../../../dtos/client/promotion-dtos/PromotionDto";
import { Op } from "sequelize";

export const GetClientPromotionsService = async (): Promise<ClientPromotionResponseDTO[]> => {
  const promotions = await PromotionModel.findAll({
    where: {
      status: {
        [Op.in]: [
          PromotionStatusTypes.ACTIVE,
          PromotionStatusTypes.PLANNED,
        ],
      },
    },
    include: [
      {
        model: PromotionAttractionModel,
        as: "promotion_attractions",
        required: false,
        include: [
          {
            model: AttractionModel,
            as: "attractions",
            required: false,
          },
        ],
      },
    ],
    order: [
      ["createdAt", "DESC"],
      [
        {
          model: PromotionAttractionModel,
          as: "promotion_attractions",
        },
        "sort_order",
        "ASC",
      ],
    ],
  });

  return promotions.map(ClientPromotionDTO);
};
