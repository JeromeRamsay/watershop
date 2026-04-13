import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { Customer, CustomerSchema } from "./entities/customer.entity";
import { Order, OrderSchema } from "../orders/entities/order.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import {
  RefillOverride,
  RefillOverrideSchema,
} from "../refill-overrides/entities/refill-override.entity";

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: RefillOverride.name, schema: RefillOverrideSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Export Service if OrdersModule needs to use it later
})
export class CustomersModule {}
