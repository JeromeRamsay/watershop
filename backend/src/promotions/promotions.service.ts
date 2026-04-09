import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Promotion, PromotionDocument } from "./entities/promotion.entity";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
    private realtimeService: RealtimeService,
  ) {}

  private generateName(): string {
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `wwpromo${digits}`;
  }

  async create(dto: CreatePromotionDto) {
    const promotion = new this.promotionModel({
      ...dto,
      name: dto.name?.trim() || this.generateName(),
      inventoryItem: new Types.ObjectId(dto.inventoryItem),
      minQuantity: dto.minQuantity ?? 1,
      maxQuantity: dto.maxQuantity ?? null,
      isActive: dto.isActive ?? true,
    });
    await promotion.save();
    this.realtimeService.emitDashboardUpdate("promotions.created");
    return promotion.populate("inventoryItem", "name sku");
  }

  async findAll() {
    return this.promotionModel
      .find()
      .populate("inventoryItem", "name sku")
      .sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const promo = await this.promotionModel
      .findById(id)
      .populate("inventoryItem", "name sku");
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    return promo;
  }

  async findActive(inventoryItemId: string, quantity: number) {
    const now = new Date();
    return this.promotionModel
      .find({
        inventoryItem: new Types.ObjectId(inventoryItemId),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        minQuantity: { $lte: quantity },
        $or: [
          { maxQuantity: null },
          { maxQuantity: { $gte: quantity } },
        ],
      })
      .populate("inventoryItem", "name sku")
      .sort({ createdAt: -1 });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.inventoryItem) update.inventoryItem = new Types.ObjectId(dto.inventoryItem);
    if (dto.name !== undefined) update.name = dto.name?.trim() || this.generateName();
    const promo = await this.promotionModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate("inventoryItem", "name sku");
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    this.realtimeService.emitDashboardUpdate("promotions.updated");
    return promo;
  }

  async remove(id: string) {
    const promo = await this.promotionModel.findByIdAndDelete(id);
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    this.realtimeService.emitDashboardUpdate("promotions.deleted");
    return { deleted: true };
  }
}
