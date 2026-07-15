declare interface UserCardResponseDTO {
  id: number;
  card: string;
  nfc: string;
  status: CardStatusTypes;
  type: CardType;
  balance: number;
}

declare interface GetUserCardsResponseDTO {
  cards: UserCardResponseDTO[];
  totalBalance: number;
}
