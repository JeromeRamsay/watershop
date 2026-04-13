import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
// Import Order Schema
import { Order, OrderSchema } from "../orders/entities/order.entity";
import {
  RefillOverride,
  RefillOverrideSchema,
} from "../refill-overrides/entities/refill-override.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: RefillOverride.name, schema: RefillOverrideSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
