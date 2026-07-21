declare interface NewsModelI {
  id: number;
  title: string;
  description: string;
  file: number;
  status: import("./enums").NewsStatusTypes;
  publish_at: Date;
  expired_at: Date;
  published_at: Date | null;
  archived_at: Date | null;
}