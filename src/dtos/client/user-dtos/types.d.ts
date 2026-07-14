declare interface UserResponseDTO extends Omit<
  UserModelI,
  "telegram_id" | "telegram_chat_id" | "phone_verified_at"
> {}
