declare interface TelegramMiniAppUserI {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

declare interface ValidatedTelegramInitDataI {
  user: TelegramMiniAppUserI;
  auth_date: number;
  query_id: string | null;
  start_param: string | null;
  chat_instance: string | null;
  chat_type: string | null;
  signature: string | null;
}
