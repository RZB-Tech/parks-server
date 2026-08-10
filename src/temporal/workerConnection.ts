import { NativeConnection } from "@temporalio/worker";

let connection: NativeConnection | null = null;

export const getWorkerConnection = async () => {
  if (connection) return connection;

  connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });

  return connection;
};
