declare interface SendOtpResponseDTO {
  phone_number: string;
  expires_in: number;
  resend_in: number;
  remaining_send_attempts: number;
}

declare interface PrepareOtpData {
  phone_number: string;
  purpose: OtpTypes;

  /*
   * Registration:
   * hash_key = phoneNumber
   *
   * Card relation:
   * hash_key = `${phoneNumber}:${cardID}`
   */
  hash_key: string;

  sms_type: SmsTypes;
  template: string;
  masked_message: string;

  metadata?: Record<string, unknown>;
}

declare interface VerifyOtpData {
  phone_number: string;
  purpose: OtpTypes;
  hash_key: string;
  code: string;
}
