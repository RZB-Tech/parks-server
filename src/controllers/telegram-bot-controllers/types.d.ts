declare type TelegramRegistrationStep =
  | "full_name"
  | "date_of_birth"
  | "phone";

declare interface TelegramRegistrationState {
  step: TelegramRegistrationStep;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  language?: import("../../models/postgresql/client/user-model/enums").UserLanguageTypes;
}

declare interface TelegramBotUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

declare interface TelegramContact {
  phone_number: string;
  user_id?: number;
}

declare interface TelegramMessage {
  text?: string;
  chat: { id: number; type: string };
  from?: TelegramBotUser;
  contact?: TelegramContact;
}

declare interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}
