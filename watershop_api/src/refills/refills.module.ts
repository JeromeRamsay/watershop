import { Module } from "@nestjs/common";
import { RefillsService } from "./refills.service";
import { RefillsController } from "./refills.controller";
import { CustomersModule } from "../customers/customers.module";
import { OrdersModule } from "../orders/orders.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [CustomersModule, OrdersModule, NotificationsModule],
  controllers: [RefillsController],
  providers: [RefillsService],
})
export class RefillsModule {}
