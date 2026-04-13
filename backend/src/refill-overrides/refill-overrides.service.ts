import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../customers/entities/customer.entity";
import { RealtimeService } from "../realtime/realtime.service";
import { CreateRefillOverrideDto } from "./dto/create-refill-override.dto";
import {
  RefillOverride,
  RefillOverrideDocument,
} from "./entities/refill-override.entity";

@Injectable()
export class RefillOverridesService {
  constructor(
    @InjectModel(RefillOverride.name)
    private refillOverrideModel: Model<RefillOverrideDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async create(createDto: CreateRefillOverrideDto, actingUserId?: string) {
    if (!actingUserId) {
      throw new UnauthorizedException();
    }

    if (!Types.ObjectId.isValid(createDto.customerId)) {
      throw new BadRequestException("Invalid customer id");
    }

    if (!Types.ObjectId.isValid(createDto.itemId)) {
      throw new BadRequestException("Invalid item id");
    }

    if (!Types.ObjectId.isValid(actingUserId)) {
      throw new UnauthorizedException();
    }

    const customer = await this.customerModel.findById(createDto.customerId).exec();
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found`,
      );
    }

    const prepaidItems = (customer.wallet?.prepaidItems || []).map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      quantityRemaining: Number(item.quantityRemaining || 0),
      expiryDate: item.expiryDate,
    }));

    const targetItem = prepaidItems.find(
      (item) => item.itemId?.toString() === createDto.itemId,
    );

    if (!targetItem) {
      throw new BadRequestException(
        "Customer does not have refill credits for this item",
      );
    }

    const nextQuantity = targetItem.quantityRemaining + createDto.quantityDelta;
    if (nextQuantity < 0) {
      throw new BadRequestException(
        "Override would reduce remaining refills below zero",
      );
    }

    targetItem.quantityRemaining = nextQuantity;

    customer.wallet = {
      storeCredit: Number(customer.wallet?.storeCredit || 0),
      prepaidItems,
    } as CustomerDocument["wallet"];

    const override = new this.refillOverrideModel({
      customer: customer._id,
      itemId: new Types.ObjectId(createDto.itemId),
      itemName: targetItem.itemName,
      quantityDelta: createDto.quantityDelta,
      actedBy: new Types.ObjectId(actingUserId),
      notes: createDto.notes?.trim() || undefined,
      source: "manual_override",
    });

    await customer.save();
    const savedOverride = await override.save();
    this.realtimeService.emitDashboardUpdate("customers.refill_overrides.updated");

    return {
      id: savedOverride._id,
      customerId: createDto.customerId,
      itemId: createDto.itemId,
      itemName: targetItem.itemName,
      quantityDelta: createDto.quantityDelta,
      quantityRemaining: nextQuantity,
      notes: savedOverride.notes,
      actedBy: savedOverride.actedBy,
      source: savedOverride.source,
      createdAt: savedOverride.createdAt,
    };
  }
}