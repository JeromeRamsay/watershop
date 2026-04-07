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
        // TCP keepalive — sends probes every 15 s to prevent the managed-network
        // 300-second idle-connection timeout from silently dropping the socket.
        keepAlive: number;
        // Exponential backoff: 500 ms, 1 s, 1.5 s … capped at 10 s.
        reconnectStrategy: (retries: number) => number;
      };
      // Redis PING sent every 60 s as belt-and-suspenders keepalive.
      pingInterval: number;
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

    const reconnectStrategy = (retries: number): number => {
      const delay = Math.min(retries * 500, 10_000);
      this.logger.warn(
        `Valkey reconnecting (attempt ${retries + 1}) in ${delay} ms…`,
      );
      return delay;
    };

    const socketOptions = {
      host,
      port,
      tls: tlsEnabled,
      keepAlive: 15_000,       // TCP keepalive every 15 s
      reconnectStrategy,
    };

    const baseClient = createClient({
      username,
      password,
      socket: socketOptions,
      pingInterval: 60_000,    // Redis PING every 60 s
    });

    this.publisher = baseClient;
    this.subscriber = baseClient.duplicate();

    this.publisher.on("error", (error) => {
      this.logger.error(`Valkey publisher error: ${String(error.message)}`);
    });
    this.subscriber.on("error", (error) => {
      this.logger.error(`Valkey subscriber error: ${String(error.message)}`);
    });

    // Re-enable publishing once the publisher comes back after a reconnect.
    this.publisher.on("ready", () => {
      if (!this.redisEnabled) {
        this.redisEnabled = true;
        this.logger.log("Valkey publisher reconnected — realtime re-enabled.");
      }
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
