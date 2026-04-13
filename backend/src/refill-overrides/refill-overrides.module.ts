import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Customer, CustomerSchema } from "../customers/entities/customer.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import { RefillOverridesController } from "./refill-overrides.controller";
import { RefillOverridesService } from "./refill-overrides.service";
import {
  RefillOverride,
  RefillOverrideSchema,
} from "./entities/refill-override.entity";

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([
      { name: RefillOverride.name, schema: RefillOverrideSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [RefillOverridesController],
  providers: [RefillOverridesService],
  exports: [RefillOverridesService],
})
export class RefillOverridesModule {}