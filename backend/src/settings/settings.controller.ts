import { Controller, Get, Body, Patch } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get store configuration" })
  findOne() {
    return this.settingsService.findOne();
  }

  @Patch()
  @ApiOperation({ summary: "Update store configuration" })
  update(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(updateSettingDto);
  }
}
