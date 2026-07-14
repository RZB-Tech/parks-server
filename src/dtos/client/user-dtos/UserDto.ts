export const UserDTO = (data: UserModelI): UserResponseDTO => {
  return {
    id: Number(data.id),
    telegram_username: data.telegram_username ?? null,
    telegram_avatar: data.telegram_avatar ?? null,
    telegram_first_name: data.telegram_first_name,
    telegram_last_name: data.telegram_last_name ?? null,
    fullname: data.fullname,
    phone_number: data.phone_number,
    date_of_birth: data.date_of_birth,
    status: data.status,
    registered_at: data.registered_at ?? null,
  };
};
