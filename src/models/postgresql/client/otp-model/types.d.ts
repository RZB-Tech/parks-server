declare interface OtpModelI {
  id: number;

  phone_number: string;

  purpose: import("./enums").OtpPurposeTypes;
  code_hash: string;

  send_attempts: number;
  send_window_started_at: Date | null;
  send_blocked_until: Date | null;

  verify_attempts: number;
  verify_blocked_until: Date | null;

  expires_at: Date;
  resend_at: Date;
  verified_at: Date | null;

  last_sms_log: number | null;
}
