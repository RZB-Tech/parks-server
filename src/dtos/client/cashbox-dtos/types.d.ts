declare interface ClientCashboxResponseDTO {
  id: number;
  name: string;
  place: string | null;
  status: CashboxStatusTypes;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
}
