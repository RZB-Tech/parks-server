declare interface UserModelI {
  id: number;

  telegram_id: number;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_avatar: string | null;
  telegram_first_name: string;
  telegram_last_name: string | null;

  fullname: string;

  phone_number: string;
  date_of_birth: string;

  status: import("./enums").UserStatusTypes;

  phone_verified_at: Date | null;
  registered_at: Date | null;
}
