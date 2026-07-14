declare interface AuthUserResponseDTO {
  user_id: number;
  phone_number: string;

  status: import("../../models/client/user-model/enums").UserStatusTypes;

  expires_in: number;
  resend_in: number;
  remaining_send_attempts: number;
}
