import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RefillsService } from "./refills.service";
import { CreateRefillDto } from "./dto/create-refill.dto";
import { Public } from "../auth/public.decorator";

@ApiTags("Refills")
@Controller("refills")
export class RefillsController {
  constructor(private readonly refillsService: RefillsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: "Kiosk refill redemption" })
  create(@Body() createRefillDto: CreateRefillDto) {
    return this.refillsService.create(createRefillDto);
  }
}
