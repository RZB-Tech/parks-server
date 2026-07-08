// src/temporal/client.ts

import { Client, Connection } from "@temporalio/client";

let client: Client | null = null;

export const getTemporalClient = async () => {
  if (client) return client;

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });

  client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || "default",
  });

  return client;
};
