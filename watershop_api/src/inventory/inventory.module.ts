import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { Inventory, InventorySchema } from "./entities/inventory.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService], // Exporting this because Orders module will need to check stock!
})
export class InventoryModule {}
