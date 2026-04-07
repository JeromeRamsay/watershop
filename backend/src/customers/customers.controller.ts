import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") query?: string,
    @Query("type") type?: string,
  ) {
    const hasPaginationParams =
      page !== undefined ||
      limit !== undefined ||
      (query || "").trim().length > 0 ||
      (type || "").trim().length > 0;

    if (!hasPaginationParams) {
      return this.customersService.findAll();
    }

    return this.customersService.findAllPaginated({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      query,
      type,
    });
  }

  @Get("by-phone")
  findByPhone(@Query("phone") phone: string) {
    return this.customersService.findByPhone(phone);
  }

  // Search endpoint: GET /customers/search?q=John
  @Get("search")
  search(@Query("q") query: string) {
    return this.customersService.search(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.customersService.remove(id);
  }
}
