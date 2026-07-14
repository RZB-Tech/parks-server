import { UserDTO } from "../../../dtos/client/user-dtos/UserDto";
import { BadRequest } from "../../../exceptions";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import { UserModel } from "../../../models/postgresql/client/user-model/UserModel";

export const GetMeService = async (telegramID: number) => {
  if (!telegramID || !Number.isSafeInteger(telegramID)) {
    throw BadRequest("TELEGRAM_USER_ID_INVALID");
  }

  const user = await UserModel.findOne({
    where: {
      telegram_id: telegramID,
    },
  });

  if (!user) {
    throw BadRequest("USER_NOT_REGISTERED");
  }

  if (user.status === UserStatusTypes.BLOCKED) {
    throw BadRequest("USER_BLOCKED");
  }

  if (
    user.status === UserStatusTypes.PENDING ||
    !user.phone_verified_at ||
    !user.registered_at
  ) {
    throw BadRequest("USER_NOT_VERIFIED");
  }

  if (user.status !== UserStatusTypes.ACTIVE) {
    throw BadRequest("USER_NOT_ACTIVE");
  }

  return UserDTO(user);
};
