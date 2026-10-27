declare interface CardsParams {
  cardID: number;
}

declare interface GetCardsQuery {
  search?: string;
  statuses?: CardStatusTypes | CardStatusTypes[];
  batch?: number;
  type?: CardType;
  is_auction?: boolean;
  auction_category_id?: number;
  auction_status?: import("../../models/postgresql/cards-model/enums").AuctionCardStatus;

  page?: number;
  limit?: number;
}
declare interface CreateCardsData {
  batchName?: string;
  buffer?: Buffer;
}

interface UpdateCardsData {
  status: CardStatusTypes;
  fullname: string;
  phone_number: string;
}

declare interface DeleteCardsData {
  cardIDs: Array<number>;
}

declare interface UploadCardsFromFile {
  file: Buffer;
  batch_name: string;
  type?: CardType;
  balance?: number | null;
}
