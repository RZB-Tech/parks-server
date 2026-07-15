export const ClientCashboxDTO = (
  data: CashboxModelI,
): ClientCashboxResponseDTO => {
  return {
    id: Number(data.id),
    name: data.name,
    place: data.place ?? null,
    status: data.status,
    description: data.description ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
};
