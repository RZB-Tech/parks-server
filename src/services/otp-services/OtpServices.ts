import { Transaction } from "sequelize";
import { OtpModel, SmsLogModel } from "../../plugins/db/postgresql/db";
import { GenerateOtpCode, HashOtpCode } from "../../utils/client/OtpHelper";
import { BadRequest, NotFound } from "../../exceptions";
import { OtpConfig } from "../../configs/otp";
import { AddSeconds } from "../../utils/client/OtpTimeHelper";
import {
  SmsProviderTypes,
  SmsStatusTypes,
} from "../../models/postgresql/client/smslog-model/enums";
import { SendEskizSmsService } from "../client/sms-services/EskizSmsServices";

export type PreparedOtpResult =
  | {
      blocked: true;
      blocked_until: Date;
    }
  | {
      blocked: false;

      otp_id: number;
      sms_log_id: number;

      phone_number: string;
      otp_code: string;

      expires_in: number;
      resend_in: number;
      remaining_send_attempts: number;

      metadata: Record<string, unknown>;
    };

export type PreparedOtpSuccess = Extract<
  PreparedOtpResult,
  {
    blocked: false;
  }
>;

export type VerifyOtpResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: "OTP_INVALID" | "OTP_VERIFY_BLOCKED";
    };

export const PrepareOtpService = async (
  data: PrepareOtpData,
  transaction: Transaction,
): Promise<PreparedOtpResult> => {
  const now = new Date();

  const phoneNumber = data.phone_number;

  const [otp] = await OtpModel.findOrCreate({
    where: {
      phone_number: phoneNumber,
      purpose: data.purpose,
    },

    defaults: {
      phone_number: phoneNumber,
      purpose: data.purpose,

      code_hash: HashOtpCode(data.hash_key, data.purpose, "000000"),

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
   * Verify block hali tugamagan.
   */
  if (
    otp.verify_blocked_until &&
    otp.verify_blocked_until.getTime() > now.getTime()
  ) {
    throw BadRequest("OTP_VERIFY_BLOCKED");
  }

  /*
   * SMS yuborish block muddati tugamagan.
   */
  if (
    otp.send_blocked_until &&
    otp.send_blocked_until.getTime() > now.getTime()
  ) {
    throw BadRequest("OTP_SEND_BLOCKED");
  }

  /*
   * Resend vaqti kelmagan.
   */
  if (otp.resend_at && otp.resend_at.getTime() > now.getTime()) {
    throw BadRequest("OTP_RESEND_NOT_AVAILABLE");
  }

  const sendWindowExpired =
    !otp.send_window_started_at ||
    now.getTime() - otp.send_window_started_at.getTime() >=
      OtpConfig.sendWindowSeconds * 1000;

  const currentSendAttempts = sendWindowExpired
    ? 0
    : Number(otp.send_attempts || 0);

  const sendWindowStartedAt = sendWindowExpired
    ? now
    : otp.send_window_started_at || now;

  /*
   * Block update rollback bo‘lmasligi uchun
   * transaction ichida throw qilmaymiz.
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

  const otpCodeHash = HashOtpCode(data.hash_key, data.purpose, otpCode);

  const expiresAt = AddSeconds(now, OtpConfig.expiresSeconds);

  const resendAt = AddSeconds(now, OtpConfig.resendSeconds);

  const nextSendAttempts = currentSendAttempts + 1;

  const sender = process.env.ESKIZ_FROM || "4546";

  const metadata = data.metadata ?? {};

  const smsLog = await SmsLogModel.create(
    {
      phone_number: phoneNumber,

      type: data.sms_type,

      provider: SmsProviderTypes.ESKIZ,

      status: SmsStatusTypes.PENDING,

      sender,

      template: data.template,

      /*
       * OTP ochiq holda DB'da saqlanmaydi.
       */
      message: data.masked_message,

      provider_message_id: null,

      attempts: 1,

      error_code: null,
      error_message: null,

      sent_at: null,
      delivered_at: null,
      failed_at: null,

      metadata: {
        ...metadata,
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
       * Yangi OTP yaratilganda verify
       * attemptlar qayta boshlanadi.
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

    metadata,
  };
};

export const SendPreparedOtpService = async (
  prepared: PreparedOtpSuccess,
  smsMessage: string,
): Promise<SendOtpResponseDTO> => {
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
          ...prepared.metadata,

          provider_status: providerResponse?.status ?? null,

          otp_expires_seconds: prepared.expires_in,
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

      /*
       * SMS yuborilmagan OTP ishlamasligi kerak.
       */
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

    throw BadRequest("OTP_SMS_SEND_FAILED");
  }

  return {
    phone_number: prepared.phone_number,
    expires_in: prepared.expires_in,
    resend_in: prepared.resend_in,
    remaining_send_attempts: prepared.remaining_send_attempts,
  };
};

export const VerifyOtpService = async (
  data: VerifyOtpData,
  transaction: Transaction,
): Promise<VerifyOtpResult> => {
  const now = new Date();

  const code = data.code?.trim();

  if (!code) {
    throw BadRequest("OTP code is required!");
  }

  if (!/^[0-9]{6}$/.test(code)) {
    throw BadRequest("OTP code must contain 6 digits!");
  }

  const otp = await OtpModel.findOne({
    where: {
      phone_number: data.phone_number,
      purpose: data.purpose,
    },

    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!otp) {
    throw NotFound("OTP not found!");
  }

  if (
    otp.verify_blocked_until &&
    otp.verify_blocked_until.getTime() > now.getTime()
  ) {
    throw BadRequest("OTP_VERIFY_BLOCKED");
  }

  if (!otp.expires_at || otp.expires_at.getTime() <= now.getTime()) {
    throw BadRequest("OTP_EXPIRED");
  }

  if (otp.verified_at) {
    throw BadRequest("OTP_ALREADY_VERIFIED");
  }

  const receivedCodeHash = HashOtpCode(data.hash_key, data.purpose, code);

  if (receivedCodeHash !== otp.code_hash) {
    const nextVerifyAttempts = Number(otp.verify_attempts || 0) + 1;

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
       * Transaction ichida throw qilinmaydi.
       * Aks holda block update rollback bo‘ladi.
       */
      return {
        success: false,
        error: "OTP_VERIFY_BLOCKED",
      };
    }

    await otp.update(
      {
        verify_attempts: nextVerifyAttempts,
      },
      {
        transaction,
      },
    );

    return {
      success: false,
      error: "OTP_INVALID",
    };
  }

  await otp.update(
    {
      verified_at: now,

      verify_attempts: 0,
      verify_blocked_until: null,
    },
    {
      transaction,
    },
  );

  return {
    success: true,
  };
};