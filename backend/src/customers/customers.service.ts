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
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
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

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
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

  async findByPhone(phone: string): Promise<Customer | null> {
    const digits = (phone || "").replace(/\D/g, "");
    if (!digits) return null;

    const regex = new RegExp(digits.split("").join("\\D*"));

    // First try primary customer phone
    const primary = await this.customerModel
      .findOne({ phone: { $regex: regex } })
      .exec();
    if (primary) return primary;

    // Fall back: check if the number belongs to a family member
    // and return the primary (owner) customer so the shared wallet is used
    return this.customerModel
      .findOne({ "familyMembers.phone": { $regex: regex } })
      .exec();
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
