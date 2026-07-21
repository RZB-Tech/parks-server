declare interface NewsParams {
  newsID: string;
}

declare interface GetAllNewsQuery {
  status?: import("./enums").NewsStatusTypes;
}

declare interface CreateNewsData {
  title: string;
  description: string;
  file: number;
  publish_at: string;
  expired_at: string;
}

declare interface UpdateNewsData {
  title?: string;
  description?: string;

  file?: number;

  publish_at?: string;
  expired_at?: string;
  status?: NewsStatusTypes;
}

declare interface DeleteNewsData {
  newsIDs: number[];
}
