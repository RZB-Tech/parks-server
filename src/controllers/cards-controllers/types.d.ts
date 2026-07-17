declare interface CardsParams {
  cardID: number;
}

declare interface GetCardsQuery {
  search?: string;
  statuses?: string;
  batch?: number;
  type?: string;

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

declare interface RelateCardUserData {
  nfc: string;
  phone_number: string;
}
