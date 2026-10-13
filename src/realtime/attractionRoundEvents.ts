import { Client, ClientConfig } from "pg";
import { FastifyBaseLogger } from "fastify";

export const ROUND_EVENTS_CHANNEL = "parks_attraction_round_events";
export const ROUND_CHANGE_REASONS = [
  "round.opened", "payment.client", "payment.operator", "round.closed",
  "round.cancelled", "round.refunded", "round.updated", "report.changed",
] as const;

export type AttractionRoundChange = {
  attraction_id: number;
  operator_id: number;
  round_id: number | null;
  reason: typeof ROUND_CHANGE_REASONS[number];
};

const validID = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export const parseRoundChange = (payload: string): AttractionRoundChange | null => {
  try {
    const value = JSON.parse(payload);
    if (!value || !validID(value.attraction_id) || !validID(value.operator_id) ||
      !(value.round_id === null || validID(value.round_id)) ||
      !ROUND_CHANGE_REASONS.includes(value.reason) ||
      (value.reason === "report.changed") !== (value.round_id === null)) return null;
    // Never forward arbitrary fields from a database notification to browsers.
    return {
      attraction_id: value.attraction_id, operator_id: value.operator_id,
      round_id: value.round_id, reason: value.reason,
    };
  } catch {
    return null;
  }
};

type Subscription = {
  attractionID: number;
  operatorID: number;
  onChange: (change: AttractionRoundChange) => void;
  onUnavailable: () => void;
};

export class AttractionRoundEventBroker {
  available = false;
  private subscriptions = new Set<Subscription>();

  subscribe(subscription: Subscription): () => void {
    this.subscriptions.add(subscription);
    return () => this.subscriptions.delete(subscription);
  }

  publish(change: AttractionRoundChange): void {
    for (const subscription of this.subscriptions) {
      if (subscription.attractionID === change.attraction_id &&
        subscription.operatorID === change.operator_id) subscription.onChange(change);
    }
  }

  disconnect(): void {
    this.available = false;
    const subscriptions = [...this.subscriptions];
    this.subscriptions.clear();
    for (const subscription of subscriptions) subscription.onUnavailable();
  }
}

// LISTEN needs a dedicated session; it must never use Sequelize's pooled queries.
export class AttractionRoundEventListener {
  private client: Client | null = null;
  private retryTimer?: NodeJS.Timeout;
  private stopped = false;
  private failures = 0;

  constructor(
    private broker: AttractionRoundEventBroker,
    private config: ClientConfig,
    private log: Pick<FastifyBaseLogger, "warn" | "error">,
    private createClient: (config: ClientConfig) => Client = (config) => new Client(config),
  ) {}

  async start(): Promise<void> {
    if (this.stopped || this.client) return;
    const client = this.createClient({ ...this.config, connectionTimeoutMillis: 5000,
      query_timeout: 5000, keepAlive: true, keepAliveInitialDelayMillis: 10_000,
      application_name: "parks-round-events" });
    this.client = client;
    const lost = () => {
      if (this.client !== client) return;
      this.client = null;
      this.broker.disconnect();
      void client.end().catch(() => undefined);
      this.scheduleRetry();
    };
    client.on("error", () => {
      this.log.warn("Attraction round listener disconnected; reconnecting");
      lost();
    });
    client.on("end", lost);
    client.on("notification", (notification) => {
      if (this.client !== client || !this.broker.available ||
        notification.channel !== ROUND_EVENTS_CHANNEL) return;
      const change = parseRoundChange(notification.payload ?? "");
      if (change) this.broker.publish(change);
      else this.log.warn("Ignored invalid attraction round notification");
    });
    try {
      await client.connect();
      if (this.stopped || this.client !== client) return;
      await client.query(`LISTEN ${ROUND_EVENTS_CHANNEL}`);
      if (this.stopped || this.client !== client) return;
      this.failures = 0;
      this.broker.available = true;
    } catch {
      this.log.error("Cannot listen for attraction round events; retrying");
      lost();
    }
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer) return;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.failures++, 5));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.start();
    }, delay);
    this.retryTimer.unref();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.broker.disconnect();
    const client = this.client;
    this.client = null;
    await client?.end().catch(() => undefined);
  }
}

declare module "fastify" {
  interface FastifyInstance {
    attractionRoundEvents: AttractionRoundEventBroker;
  }
}
