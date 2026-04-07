import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DeliveriesService } from "./deliveries.service";
import { DeliveriesController } from "./deliveries.controller";
import { Delivery, DeliverySchema } from "./entities/delivery.entity";
import { Order, OrderSchema } from "../orders/entities/order.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Delivery.name, schema: DeliverySchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService], // <--- CRITICAL: Allows OrdersModule to use this service
})
export class DeliveriesModule {}
