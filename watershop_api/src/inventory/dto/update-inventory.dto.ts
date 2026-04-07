import { PartialType } from "@nestjs/swagger"; // Use from swagger to keep docs
import { CreateInventoryDto } from "./create-inventory.dto";

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}
