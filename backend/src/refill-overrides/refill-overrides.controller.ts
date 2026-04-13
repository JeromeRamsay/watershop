import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateRefillOverrideDto } from "./dto/create-refill-override.dto";
import { RefillOverridesService } from "./refill-overrides.service";

interface AuthenticatedRequest {
  user?: {
    userId?: string;
    username?: string;
    role?: string;
  };
}

@ApiTags("Refill Overrides")
@Controller("refill-overrides")
export class RefillOverridesController {
  constructor(private readonly refillOverridesService: RefillOverridesService) {}

  @Post()
  @Throttle({ short: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: "Apply a manual refill override for a customer item" })
  create(
    @Body() createDto: CreateRefillOverrideDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const actingUserId = request.user?.userId;
    if (!actingUserId) {
      throw new UnauthorizedException();
    }

    return this.refillOverridesService.create(createDto, actingUserId);
  }
}