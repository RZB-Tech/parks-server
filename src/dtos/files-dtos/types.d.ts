declare interface FilesResponseDTO {
  id: number;
  name: string;
  size: number;
  type: string;
  // url: string;
  // download_url?: string;
}

declare interface FileViewDTO {
  body: any;
  type: string;
  name: string;
  cacheControl?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

declare interface UploadFilesResponseDTO {
  dashboard_file?: number | null;
  main_file?: number | null;
  files: number[];
  sub_attraction_files: number[];
}

declare interface UploadFileData {
  buffer: Buffer;
  filename: string;
  type: string;
  size: number;
  fieldname: "dashboard_file" | "main_file" | "files";
}
