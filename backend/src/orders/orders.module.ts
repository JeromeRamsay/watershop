import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { Order, OrderSchema } from "./entities/order.entity";

// Import External Modules
import { InventoryModule } from "../inventory/inventory.module";
import { CustomersModule } from "../customers/customers.module";
// --- ADD THIS LINE ---
import { DeliveriesModule } from "../deliveries/deliveries.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    InventoryModule, // Allows access to InventoryService
    CustomersModule, // Allows access to CustomersService
    DeliveriesModule, // Now this will work
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
