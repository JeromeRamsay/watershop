import { Body, Controller, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReportClientErrorDto } from "./dto/report-client-error.dto";
import { ClientErrorsService } from "./client-errors.service";

interface AuthenticatedRequest {
  user?: {
    userId?: string;
    username?: string;
    role?: string;
  };
}

@ApiTags("Client Errors")
@Controller("client-errors")
export class ClientErrorsController {
  constructor(private readonly clientErrorsService: ClientErrorsService) {}

  @Post()
  @Throttle({ short: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: "Capture a browser/client error from the employee app" })
  report(
    @Body() reportClientErrorDto: ReportClientErrorDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientErrorsService.report(reportClientErrorDto, request.user);
  }
}