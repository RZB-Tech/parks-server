import { Op, Transaction } from "sequelize";
import { BadRequest } from "../../../exceptions";
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

type PreparedRegistrationResult =
  | {
      blocked: true;
      blocked_until: Date;
    }
  | {
      blocked: false;
      user: UserModelI;
      otp_id: number;
      sms_log_id: number;
      phone_number: string;
      otp_code: string;
      expires_in: number;
      resend_in: number;
      remaining_send_attempts: number;
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

  const fullname = body.fullname;

  const phoneNumber = NormalizeUzPhoneNumber(body.phone_number);

  const dateOfBirth = body.date_of_birth;

  const sequelize = UserModel.sequelize!;

  const prepared = await sequelize.transaction(
    async (transaction: Transaction): Promise<PreparedRegistrationResult> => {
      const now = new Date();

      const [userByTelegram, userByPhone] = await Promise.all([
        UserModel.findOne({
          where: { telegram_id: telegramID },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        UserModel.findOne({
          where: { phone_number: phoneNumber },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);

      /*
       * Bu telefon boshqa Telegram akkauntga
       * biriktirilgan.
       */
      if (userByPhone && Number(userByPhone.telegram_id) !== telegramID) {
        throw BadRequest("PHONE_NUMBER_ALREADY_REGISTERED");
      }

      if (userByTelegram?.status === UserStatusTypes.BLOCKED) {
        throw BadRequest("USER_BLOCKED");
      }

      /*
       * Registration allaqachon yakunlangan.
       */
      if (
        userByTelegram?.status === UserStatusTypes.ACTIVE &&
        userByTelegram.phone_verified_at
      ) {
        throw BadRequest("USER_ALREADY_REGISTERED");
      }

      let user: UserModel;

      if (userByTelegram) {
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
            fullname,
            telegram_bot_active: true,
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

      /*
       * Bitta telegram user uchun bitta
       * registration OTP holati.
       */
      const [otp] = await OtpModel.findOrCreate({
        where: {
          phone_number: phoneNumber,
          purpose: OtpTypes.REGISTRATION,
        },
        defaults: {
          phone_number: phoneNumber,
          purpose: OtpTypes.REGISTRATION,

          /*
           * Birinchi create uchun vaqtinchalik hash.
           * Pastda real OTP bilan almashtiriladi.
           */
          code_hash: HashOtpCode(phoneNumber, OtpTypes.REGISTRATION, "000000"),

          send_attempts: 0,
          send_window_started_at: now,
          send_blocked_until: null,

          verify_attempts: 0,
          verify_blocked_until: null,

          expires_at: new Date(0),
          resend_at: new Date(0),

          verified_at: null,
          last_sms_log: null,
        },

        transaction,
      });

      await otp.reload({
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      /*
       * OTP verify urinishlari sababli
       * blok hali tugamagan.
       */
      if (
        otp.verify_blocked_until &&
        otp.verify_blocked_until.getTime() > now.getTime()
      ) {
        throw BadRequest("OTP_VERIFY_BLOCKED");
      }

      /*
       * SMS yuborish blok muddati.
       */
      if (
        otp.send_blocked_until &&
        otp.send_blocked_until.getTime() > now.getTime()
      ) {
        throw BadRequest("OTP_SEND_BLOCKED");
      }

      /*
       * Resend vaqti hali kelmagan.
       */
      if (otp.resend_at.getTime() > now.getTime()) {
        throw BadRequest("OTP_RESEND_NOT_AVAILABLE");
      }

      const sendWindowExpired =
        !otp.send_window_started_at ||
        now.getTime() - otp.send_window_started_at.getTime() >=
          OtpConfig.sendWindowSeconds * 1000;

      const currentSendAttempts = sendWindowExpired ? 0 : otp.send_attempts;

      const sendWindowStartedAt = sendWindowExpired
        ? now
        : otp.send_window_started_at || now;

      /*
       * 5 marta yuborilgan bo‘lsa,
       * navbatdagi requestda 3 soat blok.
       *
       * Update’dan keyin transaction ichida
       * throw qilmaymiz, aks holda update rollback
       * bo‘lib ketadi.
       */
      if (currentSendAttempts >= OtpConfig.sendMaxAttempts) {
        const blockedUntil = AddSeconds(now, OtpConfig.sendBlockSeconds);

        await otp.update(
          {
            send_blocked_until: blockedUntil,
          },
          {
            transaction,
          },
        );

        return {
          blocked: true,
          blocked_until: blockedUntil,
        };
      }

      const otpCode = GenerateOtpCode();

      const otpCodeHash = HashOtpCode(
        phoneNumber,
        OtpTypes.REGISTRATION,
        otpCode,
      );

      const expiresAt = AddSeconds(now, OtpConfig.expiresSeconds);
      const resendAt = AddSeconds(now, OtpConfig.resendSeconds);
      const nextSendAttempts = currentSendAttempts + 1;
      const sender = process.env.ESKIZ_FROM || "4546";

      /*
       * SMS yuborishdan oldin pending log.
       */
      const smsLog = await SmsLogModel.create(
        {
          phone_number: phoneNumber,

          type: SmsTypes.REGISTRATION_OTP,

          provider: SmsProviderTypes.ESKIZ,

          status: SmsStatusTypes.PENDING,

          sender,

          template: "user_registration_otp",

          /*
           * OTP ochiq holatda saqlanmaydi.
           */
          message: "Central Park ro'yxatdan o'tish kodi: ******",

          provider_message_id: null,

          attempts: 1,

          error_code: null,
          error_message: null,

          sent_at: null,
          delivered_at: null,
          failed_at: null,

          metadata: {
            telegram_id: telegramID,

            otp_expires_seconds: OtpConfig.expiresSeconds,
          },
        },
        {
          transaction,
        },
      );

      await otp.update(
        {
          phone_number: phoneNumber,
          code_hash: otpCodeHash,

          send_attempts: nextSendAttempts,

          send_window_started_at: sendWindowStartedAt,

          send_blocked_until: null,

          /*
           * Yangi OTP yuborilganda verify
           * attemptlar qaytadan boshlanadi.
           */
          verify_attempts: 0,
          verify_blocked_until: null,

          expires_at: expiresAt,
          resend_at: resendAt,

          verified_at: null,

          last_sms_log: Number(smsLog.id),
        },
        {
          transaction,
        },
      );

      return {
        blocked: false,

        user,

        otp_id: Number(otp.id),
        sms_log_id: Number(smsLog.id),

        phone_number: phoneNumber,
        otp_code: otpCode,

        expires_in: OtpConfig.expiresSeconds,

        resend_in: OtpConfig.resendSeconds,

        remaining_send_attempts: Math.max(
          0,
          OtpConfig.sendMaxAttempts - nextSendAttempts,
        ),
      };
    },
  );

  /*
   * Block update transactionda saqlanib bo‘ldi.
   */
  if (prepared.blocked) {
    throw BadRequest("OTP_SEND_BLOCKED");
  }

  const smsMessage =
    `Это тест от Eskiz`;

  try {
    const providerResponse: any = await SendEskizSmsService(
      prepared.phone_number,
      smsMessage,
    );

    const providerMessageID =
      providerResponse?.id ?? providerResponse?.data?.id ?? null;

    await SmsLogModel.update(
      {
        status: SmsStatusTypes.SENT,

        provider_message_id:
          providerMessageID !== null ? String(providerMessageID) : null,

        sent_at: new Date(),

        error_code: null,
        error_message: null,

        metadata: {
          telegram_id: telegramID,

          provider_status: providerResponse?.status ?? null,

          otp_expires_seconds: OtpConfig.expiresSeconds,
        },
      },
      {
        where: {
          id: prepared.sms_log_id,
        },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown SMS provider error";

    await Promise.all([
      SmsLogModel.update(
        {
          status: SmsStatusTypes.FAILED,

          failed_at: new Date(),

          error_message: errorMessage,
        },
        {
          where: {
            id: prepared.sms_log_id,
          },
        },
      ),

      /* SMS bormagan OTP ishlamasligi kerak. */
      OtpModel.update(
        {
          expires_at: new Date(),
        },
        {
          where: {
            id: prepared.otp_id,
            last_sms_log: prepared.sms_log_id,
          },
        },
      ),
    ]);

    console.log(error)
    throw BadRequest("OTP_SMS_SEND_FAILED");
  }

  return AuthUserDTO(prepared.user, {
    expires_in: prepared.expires_in,
    resend_in: prepared.resend_in,

    remaining_send_attempts: prepared.remaining_send_attempts,
  });
};

type VerifyOtpResult =
  | {
      success: true;
      user: UserModel;
    }
  | {
      success: false;
      error: "OTP_CODE_INVALID" | "OTP_VERIFY_BLOCKED";
      remaining_attempts: number;
      blocked_until: Date | null;
    };

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

  const code = String(body.code || "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw BadRequest("OTP_CODE_INVALID_FORMAT");
  }

  const sequelize = UserModel.sequelize!;

  const result = await sequelize.transaction(
    async (transaction: Transaction): Promise<VerifyOtpResult> => {
      const now = new Date();

      const user = await UserModel.findOne({
        where: {
          telegram_id: telegramID,
          phone_number: phoneNumber,
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) {
        throw BadRequest("PENDING_USER_NOT_FOUND");
      }

      if (user.status === UserStatusTypes.BLOCKED) {
        throw BadRequest("USER_BLOCKED");
      }

      if (user.status === UserStatusTypes.ACTIVE) {
        throw BadRequest("USER_ALREADY_REGISTERED");
      }

      if (user.status !== UserStatusTypes.PENDING) {
        throw BadRequest("USER_NOT_PENDING");
      }

      const otp = await OtpModel.findOne({
        where: {
          phone_number: phoneNumber,

          purpose: OtpTypes.REGISTRATION,
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!otp) {
        throw BadRequest("OTP_NOT_FOUND");
      }

      if (otp.verified_at) {
        throw BadRequest("OTP_ALREADY_USED");
      }

      /*
       * Verify block hali tugamagan.
       */
      if (
        otp.verify_blocked_until &&
        otp.verify_blocked_until.getTime() > now.getTime()
      ) {
        return {
          success: false,

          error: "OTP_VERIFY_BLOCKED",

          remaining_attempts: 0,

          blocked_until: otp.verify_blocked_until,
        };
      }

      if (otp.expires_at.getTime() <= now.getTime()) {
        throw BadRequest("OTP_EXPIRED");
      }

      const verifyBlockExpired =
        otp.verify_blocked_until &&
        otp.verify_blocked_until.getTime() <= now.getTime();

      const currentVerifyAttempts = verifyBlockExpired
        ? 0
        : otp.verify_attempts;

      const isCorrectCode = CompareOtpCode(
        phoneNumber,
        OtpTypes.REGISTRATION,
        code,
        otp.code_hash,
      );

      if (!isCorrectCode) {
        const nextVerifyAttempts = currentVerifyAttempts + 1;

        /*
         * 5-marta xato kiritsa
         * 3 soatga blok.
         */
        if (nextVerifyAttempts >= OtpConfig.verifyMaxAttempts) {
          const blockedUntil = AddSeconds(now, OtpConfig.verifyBlockSeconds);

          await otp.update(
            {
              verify_attempts: nextVerifyAttempts,

              verify_blocked_until: blockedUntil,
            },
            {
              transaction,
            },
          );

          /*
           * Throw emas, return.
           * Aks holda attempts update rollback bo‘ladi.
           */
          return {
            success: false,

            error: "OTP_VERIFY_BLOCKED",

            remaining_attempts: 0,

            blocked_until: blockedUntil,
          };
        }

        await otp.update(
          {
            verify_attempts: nextVerifyAttempts,

            verify_blocked_until: null,
          },
          {
            transaction,
          },
        );

        return {
          success: false,

          error: "OTP_CODE_INVALID",

          remaining_attempts: OtpConfig.verifyMaxAttempts - nextVerifyAttempts,

          blocked_until: null,
        };
      }

      /*
       * OTP to‘g‘ri.
       */
      await otp.update(
        {
          verified_at: now,

          verify_attempts: 0,
          verify_blocked_until: null,

          /*
           * Qayta ishlatib bo‘lmasligi uchun.
           */
          expires_at: now,
        },
        {
          transaction,
        },
      );

      const activeUser = await user.update(
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
        success: true,
        user: activeUser,
      };
    },
  );

  /*
   * Attempt yoki block update DBga commit bo‘ldi.
   */
  if (!result.success) {
    throw BadRequest(result.error);
  }

  return UserDTO(result.user);
};
