import { randomUUID } from "crypto";
import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { InventoryModule } from "./inventory/inventory.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { SettingsModule } from "./settings/settings.module";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ReportsModule } from "./reports/reports.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { RefillsModule } from "./refills/refills.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { EmployeeHoursModule } from "./employee-hours/employee-hours.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PromotionsModule } from "./promotions/promotions.module";
import { RefillOverridesModule } from "./refill-overrides/refill-overrides.module";
import { ClientErrorsModule } from "./client-errors/client-errors.module";
import { LoggerErrorInterceptor, LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    // 1. Load .env file
    ConfigModule.forRoot({
      isGlobal: true, // Makes env variables available everywhere
    }),

    // 2. Connect to MongoDB using the variable from .env
    MongooseModule.forRoot(
      process.env.MONGO_URI || "mongodb://localhost:27017/woodstock-pos",
    ),

    // 3. Rate limiting (10 req / 60s window per IP)
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 60000,
        limit: 10,
      },
    ]),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.WATERSHOP_LOCAL_ENV_FILE ? "debug" : "info",
        genReqId: (req, res) => {
          const incomingId = req.headers["x-request-id"];
          const requestId =
            typeof incomingId === "string" && incomingId.trim()
              ? incomingId.trim()
              : randomUUID();

          res.setHeader("x-request-id", requestId);
          return requestId;
        },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) {
            return "error";
          }
          if (res.statusCode >= 400) {
            return "warn";
          }
          return "info";
        },
        customProps: (req) => ({
          requestId: (req as { id?: string }).id,
          userId:
            typeof (req as { user?: { userId?: string } }).user?.userId ===
            "string"
              ? (req as { user?: { userId?: string } }).user?.userId
              : undefined,
        }),
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            "req.body.currentPassword",
            "req.body.newPassword",
            "req.body.wallet",
            "req.body.paymentDetails",
            "res.headers.set-cookie",
          ],
          censor: "[Redacted]",
        },
        transport: process.env.WATERSHOP_LOCAL_ENV_FILE
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                singleLine: true,
                translateTime: "SYS:standard",
              },
            }
          : undefined,
      },
    }),

    // 4. Auth (global JWT strategy + PassportModule)
    AuthModule,
    TerminusModule,

    // 5. Feature Modules
    UsersModule,
    InventoryModule,
    CustomersModule,
    OrdersModule,

    DeliveriesModule,
    SettingsModule,
    ReportsModule,
    SuppliersModule,
    RefillsModule,
    NotificationsModule,
    RealtimeModule,
    EmployeeHoursModule,
    PromotionsModule,
    RefillOverridesModule,
    ClientErrorsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Apply JWT auth to every route by default (use @Public() to opt out)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply rate limiting to every route
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
  ],
})
export class AppModule {}
