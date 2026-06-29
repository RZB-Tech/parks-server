import { build } from "./app";
import getHostAddress from "./utils/getHostAddress";
import "dotenv/config";

export const app = build();

(async () => {
  try {
    (await app).ready((err: Error | null) => {
      if (err) throw err;
    });

    const serverHost = getHostAddress();

    if (!serverHost) throw new Error("Cannot determine host address");

    (await app)
      .listen({
        port: +process.env.SERVER_PORT!,
        host: process.env.DEV_MODE === "1" ? "192.168.0.146" : serverHost,
      })
      .then(async () => {
        (await app).log.info(
          { actor: "qubnix-server" },
          "Server started successfully",
        );
      });
  } catch (err) {
    (await app).log.fatal((err as Error).message);
    process.exit(1);
  }
})();
