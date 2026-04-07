import { BadRequestException, Injectable } from "@nestjs/common";
import { CustomersService } from "../customers/customers.service";
import { OrdersService } from "../orders/orders.service";
import { CreateRefillDto } from "./dto/create-refill.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class RefillsService {
  constructor(
    private customersService: CustomersService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createRefillDto: CreateRefillDto) {
    const customer = await this.customersService.findByPhone(
      createRefillDto.phone,
    );
    if (!customer) {
      throw new BadRequestException("Customer not found for this phone.");
    }

    if (!createRefillDto.items?.length) {
      throw new BadRequestException("No refill items selected.");
    }

    const customerId =
      (customer as any)?._id?.toString?.() || (customer as any)?.id;

    const items = createRefillDto.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      isPrepaidRedemption: true,
      isRefill: true,
    }));
    const totalQty = createRefillDto.items.reduce(
      (sum, i) => sum + i.quantity,
      0,
    );
    const memberName =
      createRefillDto.memberName ||
      `${(customer as any)?.firstName || ""} ${(customer as any)?.lastName || ""}`.trim() ||
      "Customer";

    try {
      const order = await this.ordersService.create({
        customerId,
        items,
        paymentMethod: "credit_redemption",
        discount: 0,
        isDelivery: false,
        paymentStatus: "paid",
        emailReceipt: false,
        refillRedemption: true,
      } as any);

      await this.notificationsService.create({
        message: `Refill confirmed for ${memberName} (${totalQty} bottle${totalQty === 1 ? "" : "s"})`,
        type: "refill_order",
      });

      return order;
    } catch (error: any) {
      const message = error?.message || "";
      const isCreditsError =
        typeof message === "string" &&
        message.toLowerCase().includes("does not have enough credits");

      if (!isCreditsError) {
        throw error;
      }

      // If customer has no/insufficient refill credits, allow refill and create unpaid order.
      const order = await this.ordersService.create({
        customerId,
        items: createRefillDto.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          isPrepaidRedemption: false,
          isRefill: true,
        })),
        paymentMethod: "cash",
        discount: 0,
        isDelivery: false,
        paymentStatus: "unpaid",
        emailReceipt: false,
        refillRedemption: false,
        skipRefillCreditTopup: true,
      } as any);

      await this.notificationsService.create({
        message: `Refill recorded as unpaid for ${memberName} (${totalQty} bottle${totalQty === 1 ? "" : "s"})`,
        type: "refill_order",
      });

      return order;
    }
  }
}
