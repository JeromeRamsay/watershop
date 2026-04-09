import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { PromotionsService } from "./promotions.service";

@ApiTags("Promotions")
@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiOperation({ summary: "Create a promotion" })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all promotions" })
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get("active")
  @ApiOperation({ summary: "Get active promotions for an item at a given quantity" })
  findActive(
    @Query("inventoryItemId") inventoryItemId: string,
    @Query("quantity") quantity: string,
  ) {
    return this.promotionsService.findActive(inventoryItemId, Number(quantity) || 1);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a promotion by id" })
  findOne(@Param("id") id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a promotion" })
  update(@Param("id") id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a promotion" })
  remove(@Param("id") id: string) {
    return this.promotionsService.remove(id);
  }
}
