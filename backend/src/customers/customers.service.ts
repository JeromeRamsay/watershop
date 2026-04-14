import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { Customer, CustomerDocument } from "./entities/customer.entity";
import { Order, OrderDocument } from "../orders/entities/order.entity";
import { RealtimeService } from "../realtime/realtime.service";
import {
  RefillOverride,
  RefillOverrideDocument,
} from "../refill-overrides/entities/refill-override.entity";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(RefillOverride.name)
    private refillOverrideModel: Model<RefillOverrideDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const newCustomer = new this.customerModel(createCustomerDto);
    try {
      const saved = await newCustomer.save();
      this.realtimeService.emitDashboardUpdate("customers.created");
      return saved;
    } catch (error: any) {
      if (error.code === 11000 && error.keyPattern) {
        if (error.keyPattern.email) {
          throw new BadRequestException(
            "A customer with this email already exists.",
          );
        }
        if (error.keyPattern.phone) {
          throw new BadRequestException(
            "A customer with this phone number already exists.",
          );
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<Customer[]> {
    return this.customerModel.find().sort({ createdAt: -1 }).exec();
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    query?: string;
    type?: string;
  }) {
    const page = Number.isFinite(params.page)
      ? Math.max(1, Math.floor(params.page))
      : 1;
    const limit = Number.isFinite(params.limit)
      ? Math.min(200, Math.max(1, Math.floor(params.limit)))
      : 10;
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    const searchQuery = (params.query || "").trim();
    if (searchQuery) {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      match.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const normalizedType = (params.type || "").trim().toLowerCase();
    if (normalizedType === "individual" || normalizedType === "business") {
      match.type = normalizedType;
    }

    const [result] = await this.customerModel.aggregate([
      { $match: match },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "orders",
                let: { customerId: "$_id" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
                  {
                    $group: {
                      _id: null,
                      orders: { $sum: 1 },
                      totalRefills: { $sum: { $ifNull: ["$refillCount", 0] } },
                    },
                  },
                ],
                as: "orderStats",
              },
            },
            {
              $addFields: {
                orders: { $ifNull: [{ $arrayElemAt: ["$orderStats.orders", 0] }, 0] },
                totalRefills: {
                  $ifNull: [{ $arrayElemAt: ["$orderStats.totalRefills", 0] }, 0],
                },
              },
            },
            { $project: { orderStats: 0 } },
          ],
        },
      },
    ]);

    const total = result?.metadata?.[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: result?.data || [],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  }

  private toPlainCustomerRecord(
    customer: CustomerDocument | Record<string, unknown>,
  ): Record<string, unknown> {
    return typeof (customer as CustomerDocument & {
      toObject?: () => Record<string, unknown>;
    }).toObject === "function"
      ? (customer as CustomerDocument & {
          toObject: () => Record<string, unknown>;
        }).toObject()
      : (customer as Record<string, unknown>);
  }

  private toPlainOrderRecord(
    order: OrderDocument | Record<string, unknown>,
  ): Record<string, unknown> {
    return typeof (order as OrderDocument & {
      toObject?: () => Record<string, unknown>;
    }).toObject === "function"
      ? (order as OrderDocument & {
          toObject: () => Record<string, unknown>;
        }).toObject()
      : (order as Record<string, unknown>);
  }

  private async loadCustomerRefillBalanceInputs(customerId: unknown) {
    return Promise.all([
      this.orderModel.find({ customer: customerId }).sort({ createdAt: -1 }).exec(),
      this.refillOverrideModel.aggregate([
        { $match: { customer: customerId } },
        {
          $group: {
            _id: "$itemId",
            itemName: { $last: "$itemName" },
            quantityDelta: { $sum: "$quantityDelta" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
  }

  private buildEffectiveWallet(
    customerRecord: Record<string, unknown>,
    orders: Array<OrderDocument | Record<string, unknown>>,
    overrideTotals: Array<{
      _id: { toString: () => string } | string;
      itemName?: string;
      quantityDelta?: number;
      count?: number;
    }>,
    includeOverrideQuantity: boolean,
  ) {
    const wallet =
      (customerRecord.wallet as
        | {
            storeCredit?: number;
            prepaidItems?: Array<{
              itemId?: { toString?: () => string } | string;
              itemName?: string;
              quantityRemaining?: number;
              expiryDate?: Date;
            }>;
          }
        | undefined) || { storeCredit: 0, prepaidItems: [] };

    const storedItems = wallet.prepaidItems || [];
    const storedItemMap = new Map(
      storedItems.map((item) => [
        String(item.itemId?.toString?.() || item.itemId || ""),
        item,
      ]),
    );

    const refillBalanceMap = new Map<string, { itemName?: string; quantity: number }>();
    for (const order of orders) {
      const orderRecord = this.toPlainOrderRecord(order);
      const refillLines = Array.isArray(orderRecord.refills) && orderRecord.refills.length
        ? (orderRecord.refills as Array<{
            item?: { toString?: () => string } | string;
            name?: string;
            quantity?: number;
            isPrepaidRedemption?: boolean;
          }>)
        : Array.isArray(orderRecord.items)
          ? (orderRecord.items as Array<{
              item?: { toString?: () => string } | string;
              name?: string;
              quantity?: number;
              isRefill?: boolean;
              isPrepaidRedemption?: boolean;
            }>).filter((item) => !!item.isRefill)
          : [];

      for (const refillLine of refillLines) {
        const itemId = String(
          refillLine.item?.toString?.() || refillLine.item || "",
        );
        const quantity = Number(refillLine.quantity || 0);
        if (!itemId || quantity <= 0) {
          continue;
        }

        const existing = refillBalanceMap.get(itemId);
        const nextQuantity =
          (existing?.quantity || 0) +
          (refillLine.isPrepaidRedemption ? -quantity : quantity);

        refillBalanceMap.set(itemId, {
          itemName: existing?.itemName || refillLine.name,
          quantity: nextQuantity,
        });
      }
    }

    const overrideMap = new Map(
      (overrideTotals || []).map((row) => [
        String(row._id?.toString?.() || row._id || ""),
        {
          itemName: row.itemName,
          quantityDelta: Number(row.quantityDelta || 0),
          count: Number(row.count || 0),
        },
      ]),
    );

    const itemIds = new Set<string>([
      ...storedItemMap.keys(),
      ...refillBalanceMap.keys(),
      ...overrideMap.keys(),
    ]);

    const prepaidItems = Array.from(itemIds)
      .map((itemId) => {
        const storedItem = storedItemMap.get(itemId);
        const orderBalance = Number(refillBalanceMap.get(itemId)?.quantity || 0);
        const overrideQuantity = Number(
          overrideMap.get(itemId)?.quantityDelta || 0,
        );
        const storedQuantityRemaining = Number(
          storedItem?.quantityRemaining || 0,
        );
        const computedQuantityRemaining = Math.max(
          0,
          orderBalance + overrideQuantity,
        );
        const quantityRemaining = Math.max(
          storedQuantityRemaining,
          computedQuantityRemaining,
        );

        return {
          itemId: storedItem?.itemId || itemId,
          itemName:
            storedItem?.itemName ||
            refillBalanceMap.get(itemId)?.itemName ||
            overrideMap.get(itemId)?.itemName ||
            "",
          quantityRemaining,
          ...(storedItem?.expiryDate ? { expiryDate: storedItem.expiryDate } : {}),
          ...(includeOverrideQuantity ? { overrideQuantity } : {}),
        };
      })
      .filter((item) => item.itemId);

    return {
      storeCredit: Number(wallet.storeCredit || 0),
      prepaidItems,
    };
  }

  private async buildCustomerForOrderProcessing(
    customer: CustomerDocument | Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const customerRecord = this.toPlainCustomerRecord(customer);
    const customerId = customerRecord._id;
    const [orders, overrideTotals] =
      await this.loadCustomerRefillBalanceInputs(customerId);

    return {
      ...customerRecord,
      wallet: this.buildEffectiveWallet(
        customerRecord,
        orders,
        overrideTotals,
        false,
      ),
    };
  }

  async findOneForOrderProcessing(id: string): Promise<Record<string, unknown>> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.buildCustomerForOrderProcessing(customer);
  }

  async findOne(id: string): Promise<Record<string, unknown>> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const customerRecord = this.toPlainCustomerRecord(customer);

    const customerId = customerRecord._id;

    const [orders, overrideTotals] =
      await this.loadCustomerRefillBalanceInputs(customerId);

    const overrideMap = new Map<string, number>(
      (overrideTotals || []).map((row: { _id: { toString: () => string }; quantityDelta: number }) => [
        row._id.toString(),
        Number(row.quantityDelta || 0),
      ]),
    );

    const orderHistory = orders.map((order) => {
      const orderRecord = this.toPlainOrderRecord(order);

      const items = Array.isArray(orderRecord.items)
        ? (orderRecord.items as Array<{ quantity?: number }>)
        : [];
      const refills = Array.isArray(orderRecord.refills)
        ? (orderRecord.refills as Array<{ quantity?: number }>)
        : [];

      return {
        id: String(orderRecord._id),
        orderId: String(orderRecord.orderNumber || orderRecord._id),
        createdAt: orderRecord.createdAt,
        totalPrice: Number(orderRecord.grandTotal || 0),
        orderStatus: String(orderRecord.status || ""),
        paymentStatus: String(orderRecord.paymentStatus || ""),
        itemsCount: items.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        ),
        refillCount: Number(
          orderRecord.refillCount ||
            refills.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        ),
      };
    });

    return {
      ...customerRecord,
      wallet: this.buildEffectiveWallet(
        customerRecord,
        orders,
        overrideTotals,
        true,
      ),
      orderHistory,
      overrideTotals: (overrideTotals || []).map(
        (row: { _id: { toString: () => string }; itemName: string; quantityDelta: number; count: number }) => ({
          itemId: row._id.toString(),
          itemName: row.itemName,
          quantityDelta: Number(row.quantityDelta || 0),
          count: Number(row.count || 0),
        }),
      ),
    };
  }

  // Search by Phone or Name (Useful for POS search bar)
  async search(query: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        $or: [
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
          { phone: { $regex: query, $options: "i" } },
        ],
      })
      .exec();
  }

  async findByPhone(phone: string): Promise<Record<string, unknown> | null> {
    const digits = (phone || "").replace(/\D/g, "");
    if (!digits) return null;

    const regex = new RegExp(digits.split("").join("\\D*"));

    // First try primary customer phone
    const primary = await this.customerModel
      .findOne({ phone: { $regex: regex } })
      .exec();
    if (primary) {
      return this.buildCustomerForOrderProcessing(primary);
    }

    // Fall back: check if the number belongs to a family member
    // and return the primary (owner) customer so the shared wallet is used
    const familyCustomer = await this.customerModel
      .findOne({ "familyMembers.phone": { $regex: regex } })
      .exec();

    if (!familyCustomer) {
      return null;
    }

    return this.buildCustomerForOrderProcessing(familyCustomer);
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    session?: ClientSession,
  ): Promise<Customer> {
    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, updateCustomerDto, { new: true, session })
      .exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    this.realtimeService.emitDashboardUpdate("customers.updated");
    return updatedCustomer;
  }

  async remove(id: string): Promise<Customer> {
    const deletedCustomer = await this.customerModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    this.realtimeService.emitDashboardUpdate("customers.removed");
    return deletedCustomer;
  }
}
