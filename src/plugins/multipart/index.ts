import { SERVER } from "../../consts/server";

export const multipartConfigs = {
  limits: {
    files: 5,
    fileSize: SERVER.MAX_FILE_SIZE,
  },
};
