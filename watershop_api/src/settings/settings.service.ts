import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { Setting, SettingDocument } from "./entities/setting.entity";

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private settingModel: Model<SettingDocument>,
  ) {}

  // We don't really use "create" manually. We use "get" which creates default if missing.
  async create(createSettingDto: CreateSettingDto) {
    const newSettings = new this.settingModel(createSettingDto);
    return newSettings.save();
  }

  // Always return the FIRST document.
  async findOne(): Promise<Setting> {
    const settings = await this.settingModel.findOne().exec();
    if (!settings) {
      // Initialize default settings if none exist
      const defaultSettings = new this.settingModel({
        storeName: "My Water Shop",
        currency: "USD",
        taxRate: 0,
        operatingHours: { open: "09:00", close: "21:00" },
      });
      return defaultSettings.save();
    }
    return settings;
  }

  // Update the single document
  async update(updateSettingDto: UpdateSettingDto): Promise<Setting> {
    // Find the first one and update it
    const settings = await this.settingModel
      .findOneAndUpdate({}, updateSettingDto, {
        new: true,
        upsert: true, // Create if not exists
      })
      .exec();
    return settings;
  }
}
