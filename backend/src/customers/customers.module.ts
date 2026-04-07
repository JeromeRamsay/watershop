import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { Customer, CustomerSchema } from "./entities/customer.entity";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Export Service if OrdersModule needs to use it later
})
export class CustomersModule {}
