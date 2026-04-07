import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { Order, OrderDocument, OrderItem } from "./entities/order.entity";
import { InventoryService } from "../inventory/inventory.service";
import { CustomersService } from "../customers/customers.service";
// Import InventoryDocument to access _id properties
import { InventoryDocument } from "../inventory/entities/inventory.entity";
// Import Delivery Service
import { DeliveriesService } from "../deliveries/deliveries.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeService } from "../realtime/realtime.service";

interface PaymentDetails {
  mode: "single" | "split";
  amount?: number;
  paymentMethod?: string;
  payments?: Array<{
    type: string;
    amount: number;
  }>;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private inventoryService: InventoryService,
    private customersService: CustomersService,
    private deliveriesService: DeliveriesService, // Inject Delivery Service
    private notificationsService: NotificationsService,
    private realtimeService: RealtimeService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const {
      customerId,
      items,
      paymentMethod,
      isPrepaidRedemption: globalPrepaid, // Renamed to globalPrepaid
      discount = 0,
      isDelivery,
      deliveryAddress,
      paymentStatus,
      deliveryDate,
      emailReceipt,
    } = createOrderDto;
    const refillRedemption = !!createOrderDto.refillRedemption;
    const skipRefillCreditTopup = !!createOrderDto.skipRefillCreditTopup;

    const paymentDetails = createOrderDto.paymentDetails as PaymentDetails;

    // 1. Fetch Customer (null for walk-in orders)
    const customer = customerId
      ? await this.customersService.findOne(customerId)
      : null;

    // 2. Process Items
    let subTotal = 0;
    const processedItems: OrderItem[] = [];
    const processedRefills: OrderItem[] = [];
    let orderUsedCredits = false; // New flag to track if any item used credits
    const refillCreditsToAdd = new Map<
      string,
      { itemName: string; quantity: number }
    >();

    for (const itemDto of items) {
      // Cast to InventoryDocument
      const inventoryItem = (await this.inventoryService.findOne(
        itemDto.itemId,
      )) as InventoryDocument;

      // B. Check Stock
      if (inventoryItem.stockQuantity < itemDto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for item: ${inventoryItem.name}`,
        );
      }

      // C. Determine Price & Credit Usage
      let unitPrice = inventoryItem.sellingPrice;

      const isRefillItem = !!itemDto.isRefill;

      if (isRefillItem && inventoryItem.refillPrice > 0) {
        unitPrice = inventoryItem.refillPrice;
      }

      // Check item-specific redemption first, then fallback to global
      const isItemRedemption =
        (!isRefillItem && (itemDto.isPrepaidRedemption || globalPrepaid)) ||
        (isRefillItem && refillRedemption);

      if (isItemRedemption) {
        // Walk-in customers cannot redeem credits
        if (!customer) {
          throw new BadRequestException(
            `Credit redemption requires a customer account. Cannot redeem credits for walk-in orders.`,
          );
        }
        // Logic: Check wallet for this specific item
        const creditRecord = customer.wallet.prepaidItems.find(
          (p) => p.itemId?.toString() === inventoryItem._id.toString(),
        );

        if (
          !creditRecord ||
          creditRecord.quantityRemaining < itemDto.quantity
        ) {
          throw new BadRequestException(
            `Customer does not have enough credits for ${inventoryItem.name}`,
          );
        }

        unitPrice = 0;
        creditRecord.quantityRemaining -= itemDto.quantity;
        orderUsedCredits = true; // Mark that credits were used in this order
      }

      if (isRefillItem && !refillRedemption && !skipRefillCreditTopup) {
        const key = inventoryItem._id.toString();
        const existing = refillCreditsToAdd.get(key);
        refillCreditsToAdd.set(key, {
          itemName: inventoryItem.name,
          quantity: (existing?.quantity || 0) + itemDto.quantity,
        });
      }

      const totalPrice = unitPrice * itemDto.quantity;
      subTotal += totalPrice;

      // D. Deduct Physical Stock
      const nextStock = Math.max(
        0,
        inventoryItem.stockQuantity - itemDto.quantity,
      );
      await this.inventoryService.update(inventoryItem._id.toString(), {
        stockQuantity: nextStock,
      } as any);

      if (nextStock === 0) {
        await this.notificationsService.createIfNotExists({
          message: `${inventoryItem.name} is out of stock`,
          type: "out_of_stock",
          inventoryItemId: inventoryItem._id.toString(),
        });
      } else if (nextStock <= (inventoryItem.lowStockThreshold || 10)) {
        await this.notificationsService.createIfNotExists({
          message: `${inventoryItem.name} is low on stock (${nextStock} left)`,
          type: "low_stock",
          inventoryItemId: inventoryItem._id.toString(),
        });
      }

      // Add to appropriate array
      const orderItem: OrderItem = {
        item: inventoryItem._id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity: itemDto.quantity,
        unitPrice,
        totalPrice,
        isPrepaidRedemption: !!isItemRedemption,
        isRefill: !!itemDto.isRefill,
      };

      if (itemDto.isRefill) {
        processedRefills.push(orderItem);
      } else {
        processedItems.push(orderItem);
      }
    }

    // 3. Save Customer Wallet Updates
    // Update wallet only if any credits were used in the order or global flag was set
    if (
      customer &&
      (orderUsedCredits || globalPrepaid || refillCreditsToAdd.size > 0)
    ) {
      const prepaidItems = (customer.wallet?.prepaidItems || []).map((p) => ({
        itemId: p.itemId,
        itemName: p.itemName,
        quantityRemaining: p.quantityRemaining,
      }));

      for (const [itemId, refill] of refillCreditsToAdd.entries()) {
        const existing = prepaidItems.find(
          (p) => p.itemId?.toString() === itemId,
        );
        if (existing) {
          existing.quantityRemaining += refill.quantity;
          if (!existing.itemName) {
            existing.itemName = refill.itemName;
          }
        } else {
          prepaidItems.push({
            itemId: new Types.ObjectId(itemId),
            itemName: refill.itemName,
            quantityRemaining: refill.quantity,
          });
        }
      }

      const updatedWallet = {
        storeCredit: customer.wallet?.storeCredit || 0,
        prepaidItems: prepaidItems.map((p) => ({
          itemId: p.itemId?.toString(), // Added null-safe operator
          itemName: p.itemName,
          quantityRemaining: p.quantityRemaining,
        })),
      };

      await this.customersService.update(customerId!, { wallet: updatedWallet });
    }

    const grandTotal = subTotal - discount;
    const finalGrandTotal = grandTotal < 0 ? 0 : grandTotal;

    // 4. Calculate Amount Paid and determine Payment Status
    let totalAmountPaid = 0;
    if (paymentDetails) {
      if (paymentDetails.mode === "single") {
        totalAmountPaid = Number(paymentDetails.amount) || 0;
      } else if (
        paymentDetails.mode === "split" &&
        Array.isArray(paymentDetails.payments)
      ) {
        totalAmountPaid = paymentDetails.payments.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0,
        );
      }
    }

    let finalPaymentStatus = paymentStatus?.toLowerCase();

    // Automatically determine status if not provided or to ensure consistency
    if (
      !finalPaymentStatus ||
      finalPaymentStatus === "paid" ||
      finalPaymentStatus === "unpaid" ||
      finalPaymentStatus === "partial"
    ) {
      if (totalAmountPaid >= finalGrandTotal && finalGrandTotal > 0) {
        finalPaymentStatus = "paid";
      } else if (totalAmountPaid > 0 && totalAmountPaid < finalGrandTotal) {
        finalPaymentStatus = "partial";
      } else if (totalAmountPaid === 0 && finalGrandTotal > 0) {
        finalPaymentStatus = "unpaid";
      } else if (finalGrandTotal === 0) {
        finalPaymentStatus = "paid"; // $0 orders are paid
      }
    }

    const refillCount = processedRefills.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    const newOrder = new this.orderModel({
      orderNumber: `ORD-${Date.now()}`,
      ...(customerId ? { customer: new Types.ObjectId(customerId) } : {}),
      isWalkIn: !customerId,
      items: processedItems,
      refills: processedRefills,
      refillCount,
      subTotal,
      discount,
      grandTotal: finalGrandTotal,
      amountPaid: totalAmountPaid,
      paymentMethod,
      isPrepaidRedemption: orderUsedCredits || !!globalPrepaid,
      status: isDelivery ? "scheduled" : "completed",
      paymentStatus: finalPaymentStatus || (isDelivery ? "pending" : "paid"),
      isDelivery: !!isDelivery,
      deliveryDate:
        isDelivery && deliveryDate ? new Date(deliveryDate) : undefined,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      emailReceipt,
      paymentDetails,
    });

    const savedOrder = await newOrder.save();

    // 5. Automatic Delivery Creation
    if (isDelivery) {
      // For known customers, prefer their saved addresses; for walk-in, use DTO address
      let resolvedAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      } | null = null;

      if (customer) {
        const customerAddr =
          customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
        resolvedAddress = customerAddr
          ? customerAddr
          : createOrderDto.deliveryAddress
            ? {
                street: createOrderDto.deliveryAddress,
                city: "",
                state: "",
                zipCode: "",
                country: "",
              }
            : null;
      } else {
        // Walk-in delivery: use address string from DTO
        resolvedAddress = createOrderDto.deliveryAddress
          ? {
              street: createOrderDto.deliveryAddress,
              city: "",
              state: "",
              zipCode: "",
              country: "",
            }
          : null;
      }

      if (!resolvedAddress) {
        throw new BadRequestException(
          "Delivery address is required for delivery orders.",
        );
      }

      // We call the delivery service to schedule it
      const delivery = await this.deliveriesService.create({
        orderId: savedOrder._id.toString(),
        ...(customerId ? { customerId } : {}),
        address: resolvedAddress,
        scheduledDate: deliveryDate || new Date().toISOString(), // Default to "Now" if empty
        status: "scheduled",
      });

      // Update order with delivery link
      const deliveryWithId = delivery as { _id?: Types.ObjectId };
      await this.orderModel.findByIdAndUpdate(savedOrder._id, {
        deliveryId: deliveryWithId._id,
      });
    }
    // --- NEW LOGIC END ---

    this.realtimeService.emitDashboardUpdate("orders.created");
    return savedOrder;
  }

  async findAll(year?: number) {
    const filter = year
      ? {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        }
      : {};

    return this.orderModel
      .find(filter)
      .populate("customer", "firstName lastName wallet")
      .exec();
  }

  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate("customer")
      .populate("items.item")
      .exec();
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async updateStatus(id: string, status: string) {
    const updated = await this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Order #${id} not found`);
    this.realtimeService.emitDashboardUpdate("orders.status_updated");
    return updated;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const existing = await this.orderModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    const updates: Partial<Order> & { customer?: Types.ObjectId } = {};

    if (updateOrderDto.customerId) {
      updates.customer = new Types.ObjectId(updateOrderDto.customerId);
    }
    if (updateOrderDto.paymentMethod) {
      updates.paymentMethod = updateOrderDto.paymentMethod;
    }
    if (typeof updateOrderDto.discount === "number") {
      updates.discount = updateOrderDto.discount;
    }
    if (typeof updateOrderDto.paymentStatus === "string") {
      updates.paymentStatus = updateOrderDto.paymentStatus.toLowerCase();
    }
    if (typeof updateOrderDto.isDelivery === "boolean") {
      updates.isDelivery = updateOrderDto.isDelivery;
    }
    if (typeof updateOrderDto.deliveryAddress === "string") {
      updates.deliveryAddress = updateOrderDto.deliveryAddress;
    }
    if (typeof updateOrderDto.deliveryDate === "string") {
      updates.deliveryDate = new Date(updateOrderDto.deliveryDate);
    }
    if (typeof updateOrderDto.emailReceipt === "boolean") {
      updates.emailReceipt = updateOrderDto.emailReceipt;
    }
    if (updateOrderDto.paymentDetails) {
      updates.paymentDetails =
        updateOrderDto.paymentDetails as unknown as Record<string, unknown>;
    }

    if (updateOrderDto.status) {
      updates.status = updateOrderDto.status.toLowerCase();
    }

    const subTotal = existing.subTotal || 0;
    const discount = updates.discount ?? existing.discount ?? 0;
    const nextGrandTotal = Math.max(0, subTotal - discount);
    updates.grandTotal = nextGrandTotal;

    let amountPaid = existing.amountPaid || 0;
    if (updateOrderDto.paymentDetails) {
      const details = updateOrderDto.paymentDetails as PaymentDetails;
      if (details.mode === "single") {
        amountPaid = Number(details.amount) || 0;
      } else if (details.mode === "split" && Array.isArray(details.payments)) {
        amountPaid = details.payments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0,
        );
      }
    } else if (updateOrderDto.amountPaid !== undefined) {
      amountPaid = Number(updateOrderDto.amountPaid) || 0;
    }
    updates.amountPaid = amountPaid;

    if (!updateOrderDto.paymentStatus) {
      if (nextGrandTotal === 0 || amountPaid >= nextGrandTotal) {
        updates.paymentStatus = "paid";
      } else if (amountPaid > 0 && amountPaid < nextGrandTotal) {
        updates.paymentStatus = "partial";
      } else {
        updates.paymentStatus = "unpaid";
      }
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(id, updates, { new: true })
      .populate("customer", "firstName lastName email phone")
      .exec();
    if (!updated) throw new NotFoundException(`Order #${id} not found`);
    this.realtimeService.emitDashboardUpdate("orders.updated");
    return updated;
  }

  async remove(id: string) {
    const deletedOrder = await this.orderModel.findByIdAndDelete(id).exec();
    if (!deletedOrder) throw new NotFoundException(`Order #${id} not found`);
    this.realtimeService.emitDashboardUpdate("orders.removed");
    return deletedOrder;
  }
}
