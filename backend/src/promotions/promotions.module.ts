import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Promotion, PromotionSchema } from "./entities/promotion.entity";
import { PromotionsService } from "./promotions.service";
import { PromotionsController } from "./promotions.controller";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Promotion.name, schema: PromotionSchema }]),
    RealtimeModule,
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
