declare interface NewsResponseDTO {
  id: number;
  title: string;
  description: string;
  file: number;
  status: NewsStatusTypes;
  publish_at: Date;
  expired_at: Date;
  published_at: Date | null;
  archived_at: Date | null;
}
