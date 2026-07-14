export const AuthUserDTO = (
  user: UserModelI,
  otpData: {
    expires_in: number;
    resend_in: number;
    remaining_send_attempts: number;
  },
): AuthUserResponseDTO => {
  return {
    user_id: Number(user.id),
    phone_number: user.phone_number,
    status: user.status,
    expires_in: otpData.expires_in,
    resend_in: otpData.resend_in,
    remaining_send_attempts: otpData.remaining_send_attempts,
  };
};
