declare interface UserCardResponseDTO {
  id: number;
  card: string;
  nfc: string;
  status: CardStatusTypes;
  type: CardType;
  balance: number;
  is_auction: boolean;
  auction_category_id: number | null;
  auction_status: import("../../../models/postgresql/cards-model/enums").AuctionCardStatus | null;
}

declare interface GetUserCardsResponseDTO {
  cards: UserCardResponseDTO[];
  totalBalance: number;
}
