import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { UpdateDeliveryDto } from "./dto/update-delivery.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Deliveries")
@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @ApiOperation({ summary: "Manually schedule a delivery" })
  create(@Body() createDeliveryDto: CreateDeliveryDto) {
    return this.deliveriesService.create(createDeliveryDto);
  }

  @Get()
  @ApiOperation({ summary: "Get delivery list (Dashboard)" })
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.deliveriesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update status (e.g. set to Delivered)" })
  update(
    @Param("id") id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
  ) {
    return this.deliveriesService.update(id, updateDeliveryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.deliveriesService.remove(id);
  }
}
