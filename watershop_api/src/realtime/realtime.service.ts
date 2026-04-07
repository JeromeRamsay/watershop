import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

export interface DashboardRealtimeEvent {
  type: "dashboard:update";
  reason: string;
  at: string;
}

type Broadcaster = (event: DashboardRealtimeEvent) => void;
const DASHBOARD_CHANNEL = "watershop:dashboard:update";

interface RedisClientLike {
  connect: () => Promise<void>;
  quit: () => Promise<void>;
  duplicate: () => RedisClientLike;
  on: (event: string, handler: (error: Error) => void) => void;
  subscribe: (
    channel: string,
    listener: (message: string) => void,
  ) => Promise<void>;
  publish: (channel: string, message: string) => Promise<number>;
}

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private broadcaster: Broadcaster = () => undefined;
  private publisher: RedisClientLike | null = null;
  private subscriber: RedisClientLike | null = null;
  private redisEnabled = false;
  private readonly instanceId = `${process.pid}-${Math.random()
    .toString(16)
    .slice(2)}`;

  setBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  async onModuleInit() {
    const host = process.env.VALKEY_HOST;
    const portValue = process.env.VALKEY_PORT;
    const username = process.env.VALKEY_USERNAME || process.env.VALKEY_USER;
    const password = process.env.VALKEY_PASSWORD;
    const tlsEnabled =
      (process.env.VALKEY_TLS || "true").toLowerCase() !== "false";

    if (!host || !portValue || !password) {
      this.logger.warn(
        "Valkey credentials are missing. Realtime will work only on a single backend instance.",
      );
      return;
    }

    const port = Number(portValue);
    if (!Number.isFinite(port)) {
      this.logger.error(`Invalid VALKEY_PORT value: ${portValue}`);
      return;
    }

    type CreateClientFn = (options: {
      username?: string;
      password?: string;
      socket: {
        host: string;
        port: number;
        tls: boolean;
      };
    }) => RedisClientLike;

    let createClient: CreateClientFn;
    try {
      ({ createClient } = (await import("redis")) as unknown as {
        createClient: CreateClientFn;
      });
    } catch {
      this.logger.error(
        "Redis package is not available. Install dependencies before enabling Valkey realtime.",
      );
      return;
    }

    const baseClient = createClient({
      username,
      password,
      socket: {
        host,
        port,
        tls: tlsEnabled,
      },
    });

    this.publisher = baseClient;
    this.subscriber = baseClient.duplicate();

    this.publisher.on("error", (error) => {
      this.logger.error(`Valkey publisher error: ${String(error.message)}`);
    });
    this.subscriber.on("error", (error) => {
      this.logger.error(`Valkey subscriber error: ${String(error.message)}`);
    });

    try {
      await this.publisher.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(DASHBOARD_CHANNEL, (message) => {
        try {
          const parsed = JSON.parse(message) as DashboardRealtimeEvent & {
            source?: string;
          };
          if (parsed.source === this.instanceId) return;
          this.broadcaster({
            type: parsed.type,
            reason: parsed.reason,
            at: parsed.at,
          });
        } catch (error) {
          this.logger.warn(
            `Failed to parse realtime event payload: ${(error as Error).message}`,
          );
        }
      });
      this.redisEnabled = true;
      this.logger.log("Valkey pub/sub realtime bridge is connected.");
    } catch (error) {
      this.redisEnabled = false;
      this.logger.error(
        `Failed to connect Valkey realtime bridge: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    const disconnects: Promise<unknown>[] = [];
    if (this.subscriber) disconnects.push(this.subscriber.quit());
    if (this.publisher) disconnects.push(this.publisher.quit());
    await Promise.allSettled(disconnects);
  }

  emitDashboardUpdate(reason: string) {
    const event: DashboardRealtimeEvent & { source?: string } = {
      type: "dashboard:update",
      reason,
      at: new Date().toISOString(),
      source: this.instanceId,
    };

    // Always broadcast locally for this instance's connected sockets.
    this.broadcaster({
      type: event.type,
      reason: event.reason,
      at: event.at,
    });

    // Publish to Valkey for cross-instance fanout.
    if (this.redisEnabled && this.publisher) {
      this.publisher
        .publish(DASHBOARD_CHANNEL, JSON.stringify(event))
        .catch((error) => {
          this.logger.error(
            `Failed to publish realtime event: ${(error as Error).message}`,
          );
        });
    }
  }
}
