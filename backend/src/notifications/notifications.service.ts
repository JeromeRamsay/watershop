import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Notification,
  NotificationDocument,
} from "./entities/notification.entity";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async findAll() {
    return this.notificationModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(params: {
    message: string;
    type: "low_stock" | "out_of_stock" | "refill_order";
    inventoryItemId?: string;
  }) {
    const notification = new this.notificationModel({
      message: params.message,
      type: params.type,
      inventoryItemId: params.inventoryItemId
        ? new Types.ObjectId(params.inventoryItemId)
        : undefined,
      resolved: false,
    });

    const saved = await notification.save();
    this.realtimeService.emitDashboardUpdate("notifications.created");
    return saved;
  }

  async createIfNotExists(params: {
    message: string;
    type: "low_stock" | "out_of_stock";
    inventoryItemId?: string;
  }) {
    const filter: Record<string, any> = {
      type: params.type,
      resolved: false,
    };
    if (params.inventoryItemId) {
      filter.inventoryItemId = new Types.ObjectId(params.inventoryItemId);
    }

    const existing = await this.notificationModel.findOne(filter).exec();
    if (existing) return existing;

    const notification = new this.notificationModel({
      message: params.message,
      type: params.type,
      inventoryItemId: params.inventoryItemId
        ? new Types.ObjectId(params.inventoryItemId)
        : undefined,
      resolved: false,
    });

    const saved = await notification.save();
    this.realtimeService.emitDashboardUpdate("notifications.created");
    return saved;
  }

  async resolve(id: string) {
    const updated = await this.notificationModel
      .findByIdAndUpdate(id, { resolved: true }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Notification #${id} not found`);
    }
    this.realtimeService.emitDashboardUpdate("notifications.resolved");
    return updated;
  }

  async resolveAll() {
    await this.notificationModel.updateMany({ resolved: false }, { resolved: true });
    this.realtimeService.emitDashboardUpdate("notifications.resolved_all");
    return { message: "All notifications resolved" };
  }
}
