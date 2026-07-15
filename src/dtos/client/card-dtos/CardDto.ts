export const UserCardDTO = (data: CardsModelI): UserCardResponseDTO => {
  return {
    id: Number(data.id),
    card: data.card,
    nfc: data.nfc,
    status: data.status,
    type: data.type,
    balance: Number(data.balance || 0),
  };
};

