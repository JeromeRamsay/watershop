import { Controller, Get, Patch, Param } from "@nestjs/common";
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

  @Patch(":id/resolve")
  @ApiOperation({ summary: "Mark a notification as resolved" })
  resolve(@Param("id") id: string) {
    return this.notificationsService.resolve(id);
  }

  @Patch("resolve-all")
  @ApiOperation({ summary: "Mark all notifications as resolved" })
  resolveAll() {
    return this.notificationsService.resolveAll();
  }
}
