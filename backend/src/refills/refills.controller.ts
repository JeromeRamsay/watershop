import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RefillsService } from "./refills.service";
import { CreateRefillDto } from "./dto/create-refill.dto";

@ApiTags("Refills")
@Controller("refills")
export class RefillsController {
  constructor(private readonly refillsService: RefillsService) {}

  @Post()
  @ApiOperation({ summary: "Kiosk refill redemption" })
  create(@Body() createRefillDto: CreateRefillDto) {
    return this.refillsService.create(createRefillDto);
  }
}
