declare interface UserModelI {
  id: number;

  telegram_id: number | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_avatar: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;

  fullname: string;

  phone_number: string;
  date_of_birth: string | null;

  status: import("./enums").UserStatusTypes;

  phone_verified_at: Date | null;
  registered_at: Date | null;
}
