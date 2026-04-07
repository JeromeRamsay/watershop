import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { Inventory, InventoryDocument } from "./entities/inventory.entity";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    // Check for duplicate SKU
    const existing = await this.inventoryModel.findOne({
      sku: createInventoryDto.sku,
    });
    if (existing) {
      throw new BadRequestException("Item with this SKU already exists");
    }
    const newItem = new this.inventoryModel(createInventoryDto);
    const saved = await newItem.save();
    this.realtimeService.emitDashboardUpdate("inventory.created");
    return saved;
  }

  async findAll(): Promise<Inventory[]> {
    return this.inventoryModel.find({ isActive: true }).exec(); // Only return active items by default
  }

  async findOne(id: string): Promise<Inventory> {
    const item = await this.inventoryModel
      .findOne({ _id: id, isActive: true })
      .exec();
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return item;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    session?: ClientSession,
  ): Promise<Inventory> {
    const updatedItem = await this.inventoryModel
      .findByIdAndUpdate(id, updateInventoryDto, { new: true, session })
      .exec();
    if (!updatedItem) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    this.realtimeService.emitDashboardUpdate("inventory.updated");
    return updatedItem;
  }

  async remove(id: string): Promise<Inventory> {
    // Soft delete (sets isActive to false instead of removing from DB)
    // This preserves order history.
    const deletedItem = await this.inventoryModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!deletedItem) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    this.realtimeService.emitDashboardUpdate("inventory.removed");
    return deletedItem;
  }
}
