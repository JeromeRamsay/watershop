import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Inventory") // Groups these in Swagger
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: "Add a new product" })
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all active products" })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single product by ID" })
  findOne(@Param("id") id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update product details or stock" })
  update(
    @Param("id") id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete a product" })
  remove(@Param("id") id: string) {
    return this.inventoryService.remove(id);
  }
}
