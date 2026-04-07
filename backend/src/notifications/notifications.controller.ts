import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications" })
  findAll() {
    return this.notificationsService.findAll();
  }
}
