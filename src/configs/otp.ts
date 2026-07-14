const GetPositiveNumber = (
  value: string | undefined,
  fallback: number,
): number => {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return fallback;
  }

  return number;
};

export const OtpConfig = {
  codeLength: 6,

  expiresSeconds: GetPositiveNumber(
    process.env.CLIENT_OTP_EXPIRES_SECONDS,
    120,
  ),

  resendSeconds: GetPositiveNumber(process.env.CLIENT_OTP_RESEND_SECONDS, 60),

  sendWindowSeconds: GetPositiveNumber(
    process.env.CLIENT_OTP_SEND_WINDOW_SECONDS,
    60 * 60,
  ),

  sendMaxAttempts: GetPositiveNumber(
    process.env.CLIENT_OTP_SEND_MAX_ATTEMPTS,
    5,
  ),

  sendBlockSeconds: GetPositiveNumber(
    process.env.CLIENT_OTP_SEND_BLOCK_SECONDS,
    3 * 60 * 60,
  ),

  verifyMaxAttempts: GetPositiveNumber(
    process.env.CLIENT_OTP_VERIFY_MAX_ATTEMPTS,
    5,
  ),

  verifyBlockSeconds: GetPositiveNumber(
    process.env.CLIENT_OTP_VERIFY_BLOCK_SECONDS,
    3 * 60 * 60,
  ),
};
