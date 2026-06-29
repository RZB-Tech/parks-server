declare interface CardsParams {
  cardID: number;
}

declare interface GetCardsQuery {
  search?: string;
  statuses?: string;
  batch: number;

  page?: number;
  limit?: number;
}
declare interface CreateCardsData {
  batchName?: string;
  buffer?: Buffer;
}

interface UpdateCardsData {
  status: CardStatusTypes;
}

declare interface DeleteCardsData {
  cardIDs: Array<number>;
}

declare interface UploadCardsFromFile {
  file: Buffer;
  batch_name: string;
}
