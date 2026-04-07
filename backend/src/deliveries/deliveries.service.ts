import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { UpdateDeliveryDto } from "./dto/update-delivery.dto";
import { Delivery, DeliveryDocument } from "./entities/delivery.entity";
import { Order, OrderDocument } from "../orders/entities/order.entity";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto, session?: ClientSession): Promise<Delivery> {
    // Check if a delivery already exists for this order
    const existing = await this.deliveryModel.findOne({
      order: createDeliveryDto.orderId,
    });
    if (existing) {
      return this.update(existing._id.toString(), createDeliveryDto as any);
    }

    const newDelivery = new this.deliveryModel({
      order: new Types.ObjectId(createDeliveryDto.orderId),
      customer: new Types.ObjectId(createDeliveryDto.customerId),
      address: createDeliveryDto.address,
      scheduledDate: createDeliveryDto.scheduledDate,
      status: createDeliveryDto.status || "scheduled",
      timeSlot: createDeliveryDto.timeSlot,
      deliveryNotes: createDeliveryDto.deliveryNotes,
    });
    const saved = await newDelivery.save({ session });

    // Link back to order
    await this.orderModel.findByIdAndUpdate(
      createDeliveryDto.orderId,
      { deliveryId: saved._id },
      { session },
    );

    this.realtimeService.emitDashboardUpdate("deliveries.created");
    return saved;
  }

  async findAll() {
    // Return deliveries sorted by date (newest first)
    return this.deliveryModel
      .find()
      .populate("customer", "firstName lastName phone")
      .populate("order", "orderNumber grandTotal paymentStatus")
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async findOne(id: string) {
    const delivery = await this.deliveryModel
      .findById(id)
      .populate("customer")
      .populate("order")
      .exec();

    if (!delivery) throw new NotFoundException(`Delivery #${id} not found`);
    return delivery;
  }

  async update(id: string, updateDeliveryDto: UpdateDeliveryDto) {
    const updated = await this.deliveryModel
      .findByIdAndUpdate(id, updateDeliveryDto, { new: true })
      .exec();

    if (!updated) throw new NotFoundException(`Delivery #${id} not found`);
    this.realtimeService.emitDashboardUpdate("deliveries.updated");
    return updated;
  }

  async remove(id: string) {
    const removed = await this.deliveryModel.findByIdAndDelete(id);
    if (removed) {
      this.realtimeService.emitDashboardUpdate("deliveries.removed");
    }
    return removed;
  }
}
