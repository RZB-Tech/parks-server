import { Op, Transaction } from "sequelize";
import { BadRequest, NotFound } from "../../../exceptions";
import { NormalizeUzPhoneNumber } from "../../../utils/client/NormilizePhoneNumber";
import {
  OtpModel,
  SmsLogModel,
  UserModel,
} from "../../../plugins/db/postgresql/db";
import { UserStatusTypes } from "../../../models/postgresql/client/user-model/enums";
import {
  CompareOtpCode,
  GenerateOtpCode,
  HashOtpCode,
} from "../../../utils/client/OtpHelper";
import { OtpTypes } from "../../../models/postgresql/client/otp-model/enums";
import { OtpConfig } from "../../../configs/otp";
import { AddSeconds } from "../../../utils/client/OtpTimeHelper";
import {
  SmsProviderTypes,
  SmsStatusTypes,
  SmsTypes,
} from "../../../models/postgresql/client/smslog-model/enums";
import { AuthUserDTO } from "../../../dtos/client/auth-dtos/AuthDto";
import { SendEskizSmsService } from "../sms-services/EskizSmsServices";
import { UserDTO } from "../../../dtos/client/user-dtos/UserDto";
import {
  PreparedOtpSuccess,
  PrepareOtpService,
  SendPreparedOtpService,
  VerifyOtpService,
} from "../../otp-services/OtpServices";

type PreparedAuthRegistration =
  | {
      blocked: true;
      blocked_until: Date;
    }
  | {
      blocked: false;
      user: UserModel;
      otp: PreparedOtpSuccess;
    };

export const AuthUserService = async (
  telegramUser: TelegramMiniAppUserI,
  body: AuthUserData,
): Promise<AuthUserResponseDTO> => {
  if (
    !telegramUser ||
    !Number.isSafeInteger(telegramUser.id) ||
    telegramUser.id <= 0
  ) {
    throw BadRequest("TELEGRAM_USER_INVALID");
  }

  const telegramID = telegramUser.id;

  const fullname = body.fullname?.trim();

  if (!fullname) {
    throw BadRequest("FULLNAME_REQUIRED");
  }

  const phoneNumber = NormalizeUzPhoneNumber(body.phone_number);

  const dateOfBirth = body.date_of_birth;

  const sequelize = UserModel.sequelize!;

  const prepared = await sequelize.transaction(
    async (transaction: Transaction): Promise<PreparedAuthRegistration> => {
      const matchedUsers = await UserModel.findAll({
        where: {
          [Op.or]: [
            {
              telegram_id: telegramID,
            },
            {
              phone_number: phoneNumber,
            },
          ],
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const userByTelegram =
        matchedUsers.find(
          (item) =>
            item.telegram_id !== null &&
            Number(item.telegram_id) === telegramID,
        ) ?? null;

      const userByPhone =
        matchedUsers.find((item) => item.phone_number === phoneNumber) ?? null;

      if (
        userByTelegram?.status === UserStatusTypes.BLOCKED ||
        userByPhone?.status === UserStatusTypes.BLOCKED
      ) {
        throw BadRequest("USER_BLOCKED");
      }

      /*
       * Shu Telegram user allaqachon
       * registrationdan o‘tgan.
       */
      if (
        userByTelegram?.status === UserStatusTypes.ACTIVE &&
        userByTelegram.phone_verified_at
      ) {
        throw BadRequest("USER_ALREADY_REGISTERED");
      }

      /*
       * Telefon boshqa tasdiqlangan
       * Telegram akkauntga bog‘langan.
       *
       * PENDING user bo‘lsa qayta ishlatish mumkin.
       */
      if (
        userByPhone?.status === UserStatusTypes.ACTIVE &&
        userByPhone.phone_verified_at &&
        userByPhone.telegram_id !== null &&
        Number(userByPhone.telegram_id) !== telegramID
      ) {
        throw BadRequest("PHONE_NUMBER_ALREADY_REGISTERED");
      }

      let user: UserModel;

      /*
       * Telefon orqali PENDING user topilsa,
       * shu user update qilinadi.
       *
       * Oldindan bog‘langan kartalar shu
       * user ID'da qoladi.
       */
      if (userByPhone) {
        if (
          userByTelegram &&
          Number(userByTelegram.id) !== Number(userByPhone.id)
        ) {
          await userByTelegram.update(
            {
              telegram_id: null,
            },
            {
              transaction,
            },
          );
        }

        user = await userByPhone.update(
          {
            telegram_id: telegramID,
            telegram_chat_id: null,

            telegram_username: telegramUser.username ?? null,

            telegram_avatar: telegramUser.photo_url ?? null,

            telegram_first_name: telegramUser.first_name.trim(),

            telegram_last_name: telegramUser.last_name?.trim() || null,

            fullname,
            phone_number: phoneNumber,
            date_of_birth: dateOfBirth,

            status: UserStatusTypes.PENDING,

            phone_verified_at: null,
            registered_at: null,
          },
          {
            transaction,
          },
        );
      } else if (userByTelegram) {
        user = await userByTelegram.update(
          {
            telegram_username: telegramUser.username ?? null,

            telegram_avatar: telegramUser.photo_url ?? null,

            telegram_first_name: telegramUser.first_name.trim(),

            telegram_last_name: telegramUser.last_name?.trim() || null,

            fullname,
            phone_number: phoneNumber,
            date_of_birth: dateOfBirth,

            status: UserStatusTypes.PENDING,

            phone_verified_at: null,
            registered_at: null,
          },
          {
            transaction,
          },
        );
      } else {
        user = await UserModel.create(
          {
            telegram_id: telegramID,
            telegram_chat_id: null,

            telegram_username: telegramUser.username ?? null,

            telegram_avatar: telegramUser.photo_url ?? null,

            telegram_first_name: telegramUser.first_name.trim(),

            telegram_last_name: telegramUser.last_name?.trim() || null,

            telegram_bot_active: true,

            fullname,
            phone_number: phoneNumber,
            date_of_birth: dateOfBirth,

            status: UserStatusTypes.PENDING,

            phone_verified_at: null,
            registered_at: null,
          },
          {
            transaction,
          },
        );
      }

      const preparedOtp = await PrepareOtpService(
        {
          phone_number: phoneNumber,

          purpose: OtpTypes.REGISTRATION,

          /*
           * Registration OTP telefon
           * bilan bog‘lanadi.
           */
          hash_key: phoneNumber,

          sms_type: SmsTypes.REGISTRATION_OTP,

          template: "user_registration_otp",

          masked_message: "Central Park ro'yxatdan o'tish kodi: ******",

          metadata: {
            user_id: Number(user.id),
            telegram_id: telegramID,
          },
        },
        transaction,
      );

      if (preparedOtp.blocked) {
        return preparedOtp;
      }

      return {
        blocked: false,
        user,
        otp: preparedOtp,
      };
    },
  );

  if (prepared.blocked) {
    throw BadRequest("OTP_SEND_BLOCKED");
  }

  /*
   * Eskiz test account bo‘lsa faqat ruxsat
   * berilgan test matn ishlaydi.
   *
   * Productionda tasdiqlangan SMS template
   * bilan real OTP yuboriladi.
   */
  const smsMessage =
    process.env.ESKIZ_TEST_MODE === "true"
      ? "Это тест от Eskiz"
      : `Central Park ro'yxatdan o'tish kodi: ${prepared.otp.otp_code}`;

  const otpResponse = await SendPreparedOtpService(prepared.otp, smsMessage);

  return AuthUserDTO(
    prepared.user.get({
      plain: true,
    }) as UserModelI,
    otpResponse,
  );
};
declare interface VerifyAuthOtpData {
  phone_number: string;
  code: string;
}

export const VerifyAuthOtpService = async (
  telegramUser: TelegramMiniAppUserI,
  body: VerifyAuthOtpData,
) => {
  if (
    !telegramUser ||
    !Number.isSafeInteger(telegramUser.id) ||
    telegramUser.id <= 0
  ) {
    throw BadRequest("TELEGRAM_USER_INVALID");
  }

  const telegramID = telegramUser.id;

  const phoneNumber = NormalizeUzPhoneNumber(body.phone_number);

  const sequelize = UserModel.sequelize!;

  const result = await sequelize.transaction(
    async (transaction: Transaction) => {
      const user = await UserModel.findOne({
        where: {
          telegram_id: telegramID,
          phone_number: phoneNumber,
          status: UserStatusTypes.PENDING,
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) {
        throw NotFound("PENDING_USER_NOT_FOUND");
      }

      const verifyResult = await VerifyOtpService(
        {
          phone_number: phoneNumber,
          purpose: OtpTypes.REGISTRATION,
          hash_key: phoneNumber,
          code: body.code,
        },
        transaction,
      );

      /*
       * Invalid attempt update rollback bo‘lmasligi
       * uchun transaction ichida throw qilinmaydi.
       */
      if (!verifyResult.success) {
        return {
          success: false as const,
          error: verifyResult.error,
        };
      }

      const now = new Date();

      await user.update(
        {
          status: UserStatusTypes.ACTIVE,

          phone_verified_at: now,
          registered_at: now,
        },
        {
          transaction,
        },
      );

      return {
        success: true as const,

        user: user.get({
          plain: true,
        }) as UserModelI,
      };
    },
  );

  if (!result.success) {
    throw BadRequest(result.error);
  }

  return UserDTO(result.user);
};
