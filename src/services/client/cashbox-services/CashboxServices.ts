import { Op } from "sequelize";
import { BadRequest } from "../../../exceptions";
import { CashboxModel, UserModel } from "../../../plugins/db/postgresql/db";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import { CashboxStatusTypes } from "../../../models/postgresql/cashbox-model/enums";
import { ClientCashboxDTO } from "../../../dtos/client/cashbox-dtos/CashboxDto";

export const GetClientCashboxesService = async (
  telegramID: number,
): Promise<ClientCashboxResponseDTO[]> => {
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

  const cashboxes = await CashboxModel.findAll({
    where: {
      status: {
        [Op.notIn]: [CashboxStatusTypes.MAINTENANCE, CashboxStatusTypes.CLOSED],
      },
    },

    order: [["name", "ASC"]],
  });

  return cashboxes.map(ClientCashboxDTO);
};
