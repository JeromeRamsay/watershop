import { Module } from "@nestjs/common";
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

    // 3. Our Feature Modules
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
