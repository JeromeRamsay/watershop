import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new order (handles stock & credits)" })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: "List all orders" })
  findAll(@Query("year") year?: string) {
    return this.ordersService.findAll(year ? parseInt(year) : undefined);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details" })
  findOne(@Param("id") id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update order status" })
  updateStatus(
    @Param("id") id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update order details" })
  update(@Param("id") id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an order" })
  remove(@Param("id") id: string) {
    return this.ordersService.remove(id);
  }
}
