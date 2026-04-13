import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDocument } from "../orders/entities/order.entity";
import {
  RefillOverride,
  RefillOverrideDocument,
} from "../refill-overrides/entities/refill-override.entity";

const STORE_TIME_ZONE = "America/Toronto";
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface ReportFilters {
  year?: number;
  from?: string;
  to?: string;
}

export interface SalesTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  todayDeliveryOrders: number;
  todayPrepaidOrders: number;
  uniqueCustomersServed: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  deliveryOrders: number;
  walkInOrders: number;
  walkInPercentage: number;
  prepaidRedemptions: number;
  refillCount: number;
  salesTrend: SalesTrendPoint[];
}

export interface WalkInStats {
  totalWalkInOrders: number;
  walkInRevenue: number;
  avgWalkInOrderValue: number;
  totalOrders: number;
  walkInPercentage: number;
  monthlyBreakdown: { month: string; orders: number; revenue: number }[];
}

interface DashboardOverviewRow {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  todayDeliveryOrders: number;
  todayPrepaidOrders: number;
  deliveryOrders: number;
  walkInOrders: number;
  prepaidRedemptions: number;
  refillCount: number;
}

interface DashboardCustomerSummaryRow {
  uniqueCustomersServed: number;
  repeatCustomers: number;
}

interface DashboardSalesTrendRow {
  _id: string;
  revenue: number;
  orders: number;
}

interface DashboardFacetResult {
  overview: DashboardOverviewRow[];
  customerSummary: DashboardCustomerSummaryRow[];
  salesTrend: DashboardSalesTrendRow[];
}

export interface RefillOverrideSummary {
  totalOverrides: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
  usersAffected: number;
  customersAffected: number;
}

export interface RefillOverrideGroupedStat {
  overrideCount: number;
  quantityDelta: number;
  positiveQuantityDelta: number;
  negativeQuantityDelta: number;
}

export interface RefillOverrideByUser extends RefillOverrideGroupedStat {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  customersAffected: number;
}

export interface RefillOverrideByCustomer extends RefillOverrideGroupedStat {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  usersAffected: number;
}

export interface RefillOverrideByUserCustomer extends RefillOverrideGroupedStat {
  userId: string;
  customerId: string;
  username?: string;
  userFirstName?: string;
  userLastName?: string;
  customerFirstName?: string;
  customerLastName?: string;
}

export interface RefillOverrideStats {
  summary: RefillOverrideSummary;
  byUser: RefillOverrideByUser[];
  byCustomer: RefillOverrideByCustomer[];
  byUserCustomer: RefillOverrideByUserCustomer[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(RefillOverride.name)
    private refillOverrideModel: Model<RefillOverrideDocument>,
  ) {}

  private getDateKeyInTimeZone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
  }

  private getMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split("-");
    const monthIndex = Number(month) - 1;
    const monthLabel = MONTH_LABELS[monthIndex] ?? monthKey;
    return `${monthLabel} ${year}`;
  }

  private getDateKeyExpression(fieldName: string) {
    return {
      $dateToString: {
        format: "%Y-%m-%d",
        date: fieldName,
        timezone: STORE_TIME_ZONE,
      },
    };
  }

  private getMonthKeyExpression(fieldName: string) {
    return {
      $dateToString: {
        format: "%Y-%m",
        date: fieldName,
        timezone: STORE_TIME_ZONE,
      },
    };
  }

  private normalizeDateKey(value: string, label: "from" | "to"): string {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      throw new BadRequestException(`Invalid ${label} date`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${label} date`);
    }

    return this.getDateKeyInTimeZone(parsed, STORE_TIME_ZONE);
  }

  private buildOrderMatch(filters: ReportFilters = {}) {
    const year = Number.isFinite(filters.year) ? Number(filters.year) : undefined;
    const hasExplicitRange = Boolean(filters.from || filters.to);

    if (hasExplicitRange) {
      const expressions: Record<string, unknown>[] = [];
      let fromKey: string | undefined;
      let toKey: string | undefined;

      if (filters.from) {
        fromKey = this.normalizeDateKey(filters.from, "from");
        expressions.push({
          $gte: [this.getDateKeyExpression("$createdAt"), fromKey],
        });
      }

      if (filters.to) {
        toKey = this.normalizeDateKey(filters.to, "to");
        expressions.push({
          $lte: [this.getDateKeyExpression("$createdAt"), toKey],
        });
      }

      if (fromKey && toKey && fromKey > toKey) {
        throw new BadRequestException(
          "The from date must be on or before the to date",
        );
      }

      if (expressions.length === 1) {
        return { $match: { $expr: expressions[0] } };
      }

      return { $match: { $expr: { $and: expressions } } };
    }

    if (year) {
      return {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      };
    }

    return { $match: {} };
  }

  private getEmptyDashboardStats(): DashboardStats {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      todayRevenue: 0,
      todayOrders: 0,
      todayDeliveryOrders: 0,
      todayPrepaidOrders: 0,
      uniqueCustomersServed: 0,
      repeatCustomers: 0,
      repeatCustomerRate: 0,
      deliveryOrders: 0,
      walkInOrders: 0,
      walkInPercentage: 0,
      prepaidRedemptions: 0,
      refillCount: 0,
      salesTrend: [],
    };
  }

  // 1. Dashboard Overview (Total Sales, Count, etc.)
  async getDashboardStats(
    filters: ReportFilters = {},
    now = new Date(),
  ): Promise<DashboardStats> {
    const matchStage = this.buildOrderMatch(filters);

    const todayKey = this.getDateKeyInTimeZone(now, STORE_TIME_ZONE);
    const todayExpression = {
      $eq: [this.getDateKeyExpression("$createdAt"), todayKey],
    };

    const stats = await this.orderModel.aggregate<DashboardFacetResult>([
      matchStage,
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$grandTotal" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$grandTotal" },
                todayRevenue: {
                  $sum: {
                    $cond: [todayExpression, "$grandTotal", 0],
                  },
                },
                todayOrders: {
                  $sum: {
                    $cond: [todayExpression, 1, 0],
                  },
                },
                todayDeliveryOrders: {
                  $sum: {
                    $cond: [
                      { $and: [todayExpression, { $eq: ["$isDelivery", true] }] },
                      1,
                      0,
                    ],
                  },
                },
                todayPrepaidOrders: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          todayExpression,
                          { $eq: ["$isPrepaidRedemption", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                deliveryOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$isDelivery", true] }, 1, 0],
                  },
                },
                walkInOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$isWalkIn", true] }, 1, 0],
                  },
                },
                prepaidRedemptions: {
                  $sum: {
                    $cond: [{ $eq: ["$isPrepaidRedemption", true] }, 1, 0],
                  },
                },
                refillCount: {
                  $sum: { $ifNull: ["$refillCount", 0] },
                },
              },
            },
          ],
          customerSummary: [
            { $match: { customer: { $ne: null } } },
            {
              $group: {
                _id: "$customer",
                orderCount: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: null,
                uniqueCustomersServed: { $sum: 1 },
                repeatCustomers: {
                  $sum: {
                    $cond: [{ $gt: ["$orderCount", 1] }, 1, 0],
                  },
                },
              },
            },
          ],
          salesTrend: [
            {
              $group: {
                _id: this.getMonthKeyExpression("$createdAt"),
                revenue: { $sum: "$grandTotal" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const overview = stats[0]?.overview?.[0];
    const customerSummary = stats[0]?.customerSummary?.[0];

    if (!overview) {
      return this.getEmptyDashboardStats();
    }

    const totalOrders = Number(overview.totalOrders || 0);
    const walkInOrders = Number(overview.walkInOrders || 0);
    const uniqueCustomersServed = Number(
      customerSummary?.uniqueCustomersServed || 0,
    );
    const repeatCustomers = Number(customerSummary?.repeatCustomers || 0);

    return {
      totalRevenue: Number(overview.totalRevenue || 0),
      totalOrders,
      avgOrderValue: Number(overview.avgOrderValue || 0),
      todayRevenue: Number(overview.todayRevenue || 0),
      todayOrders: Number(overview.todayOrders || 0),
      todayDeliveryOrders: Number(overview.todayDeliveryOrders || 0),
      todayPrepaidOrders: Number(overview.todayPrepaidOrders || 0),
      uniqueCustomersServed,
      repeatCustomers,
      repeatCustomerRate:
        uniqueCustomersServed > 0
          ? Math.round((repeatCustomers / uniqueCustomersServed) * 100)
          : 0,
      deliveryOrders: Number(overview.deliveryOrders || 0),
      walkInOrders,
      walkInPercentage:
        totalOrders > 0 ? Math.round((walkInOrders / totalOrders) * 100) : 0,
      prepaidRedemptions: Number(overview.prepaidRedemptions || 0),
      refillCount: Number(overview.refillCount || 0),
      salesTrend: (stats[0]?.salesTrend || []).map((point) => ({
        label: this.getMonthLabel(point._id),
        revenue: Number(point.revenue || 0),
        orders: Number(point.orders || 0),
      })),
    };
  }

  // 2. Top 5 Selling Items (Most Purchased)
  async getTopSellingItems(filters: ReportFilters = {}): Promise<any[]> {
    const matchStage = this.buildOrderMatch(filters);

    return this.orderModel.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.item",
          name: { $first: "$items.name" },
          totalSold: { $sum: "$items.quantity" },
          revenueGenerated: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);
  }

  // 3. Top 5 Customers (By Money Spent)
  async getTopCustomers(filters: ReportFilters = {}) {
    const baseMatchStage = this.buildOrderMatch(filters);

    return this.orderModel.aggregate([
      {
        $match: {
          ...(baseMatchStage.$match as Record<string, unknown>),
          customer: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalSpent: { $sum: "$grandTotal" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo",
        },
      },
      { $unwind: "$customerInfo" },
      {
        $project: {
          firstName: "$customerInfo.firstName",
          lastName: "$customerInfo.lastName",
          phone: "$customerInfo.phone",
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]);
  }

  // 5. Walk-In Order Metrics
  async getWalkInStats(filters: ReportFilters = {}): Promise<WalkInStats> {
    const baseMatchStage = this.buildOrderMatch(filters);

    interface WalkInTotals {
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
    }
    interface WalkInMonthly {
      _id: string;
      orders: number;
      revenue: number;
    }
    interface WalkInFacet {
      totals: WalkInTotals[];
      monthly: WalkInMonthly[];
    }

    const baseMatch = baseMatchStage.$match as Record<string, unknown>;

    const [walkInResult, totalOrders] = await Promise.all([
      this.orderModel.aggregate<WalkInFacet>([
        {
          $match: {
            ...baseMatch,
            isWalkIn: true,
          },
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: { $sum: "$grandTotal" },
                  avgOrderValue: { $avg: "$grandTotal" },
                },
              },
            ],
            monthly: [
              {
                $group: {
                  _id: this.getMonthKeyExpression("$createdAt"),
                  orders: { $sum: 1 },
                  revenue: { $sum: "$grandTotal" },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
      this.orderModel.countDocuments(baseMatch),
    ]);

    const totals: WalkInTotals = walkInResult[0]?.totals[0] ?? {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
    };

    const monthlyBreakdown = (walkInResult[0]?.monthly ?? []).map((row) => ({
      month: this.getMonthLabel(row._id),
      orders: row.orders,
      revenue: row.revenue,
    }));

    const walkInPercentage =
      totalOrders > 0
        ? Math.round((totals.totalOrders / totalOrders) * 100)
        : 0;

    return {
      totalWalkInOrders: totals.totalOrders,
      walkInRevenue: totals.totalRevenue,
      avgWalkInOrderValue: totals.avgOrderValue ?? 0,
      totalOrders,
      walkInPercentage,
      monthlyBreakdown,
    };
  }

  // 4. Most Frequent Customers (By Visit Count)
  async getFrequentCustomers(filters: ReportFilters = {}) {
    const baseMatchStage = this.buildOrderMatch(filters);

    return this.orderModel.aggregate([
      {
        $match: {
          ...(baseMatchStage.$match as Record<string, unknown>),
          customer: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$customer",
          visitCount: { $sum: 1 },
          totalSpent: { $sum: "$grandTotal" },
        },
      },
      { $sort: { visitCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo",
        },
      },
      { $unwind: "$customerInfo" },
      {
        $project: {
          firstName: "$customerInfo.firstName",
          lastName: "$customerInfo.lastName",
          visitCount: 1,
          totalSpent: 1,
        },
      },
    ]);
  }

  async getRefillOverrideStats(
    filters: ReportFilters = {},
  ): Promise<RefillOverrideStats> {
    interface RefillOverrideFacetResult {
      summary: Array<{
        totalOverrides: number;
        quantityDelta: number;
        positiveQuantityDelta: number;
        negativeQuantityDelta: number;
        usersAffected: number;
        customersAffected: number;
      }>;
      byUser: Array<{
        userId: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        overrideCount: number;
        quantityDelta: number;
        positiveQuantityDelta: number;
        negativeQuantityDelta: number;
        customersAffected: number;
      }>;
      byCustomer: Array<{
        customerId: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        overrideCount: number;
        quantityDelta: number;
        positiveQuantityDelta: number;
        negativeQuantityDelta: number;
        usersAffected: number;
      }>;
      byUserCustomer: Array<{
        userId: string;
        customerId: string;
        username?: string;
        userFirstName?: string;
        userLastName?: string;
        customerFirstName?: string;
        customerLastName?: string;
        overrideCount: number;
        quantityDelta: number;
        positiveQuantityDelta: number;
        negativeQuantityDelta: number;
      }>;
    }

    const matchStage = this.buildOrderMatch(filters);

    const result = await this.refillOverrideModel.aggregate<RefillOverrideFacetResult>([
      { $match: matchStage.$match as Record<string, unknown> },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalOverrides: { $sum: 1 },
                quantityDelta: { $sum: "$quantityDelta" },
                positiveQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $gt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                negativeQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $lt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                usersAffected: { $addToSet: "$actedBy" },
                customersAffected: { $addToSet: "$customer" },
              },
            },
            {
              $project: {
                _id: 0,
                totalOverrides: 1,
                quantityDelta: 1,
                positiveQuantityDelta: 1,
                negativeQuantityDelta: 1,
                usersAffected: { $size: "$usersAffected" },
                customersAffected: { $size: "$customersAffected" },
              },
            },
          ],
          byUser: [
            {
              $group: {
                _id: "$actedBy",
                overrideCount: { $sum: 1 },
                quantityDelta: { $sum: "$quantityDelta" },
                positiveQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $gt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                negativeQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $lt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                customersAffected: { $addToSet: "$customer" },
              },
            },
            { $sort: { overrideCount: -1, quantityDelta: -1 } },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                userId: { $toString: "$_id" },
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                username: "$user.username",
                overrideCount: 1,
                quantityDelta: 1,
                positiveQuantityDelta: 1,
                negativeQuantityDelta: 1,
                customersAffected: { $size: "$customersAffected" },
              },
            },
          ],
          byCustomer: [
            {
              $group: {
                _id: "$customer",
                overrideCount: { $sum: 1 },
                quantityDelta: { $sum: "$quantityDelta" },
                positiveQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $gt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                negativeQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $lt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                usersAffected: { $addToSet: "$actedBy" },
              },
            },
            { $sort: { overrideCount: -1, quantityDelta: -1 } },
            {
              $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "customer",
              },
            },
            {
              $unwind: {
                path: "$customer",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                customerId: { $toString: "$_id" },
                firstName: "$customer.firstName",
                lastName: "$customer.lastName",
                email: "$customer.email",
                phone: "$customer.phone",
                overrideCount: 1,
                quantityDelta: 1,
                positiveQuantityDelta: 1,
                negativeQuantityDelta: 1,
                usersAffected: { $size: "$usersAffected" },
              },
            },
          ],
          byUserCustomer: [
            {
              $group: {
                _id: { actedBy: "$actedBy", customer: "$customer" },
                overrideCount: { $sum: 1 },
                quantityDelta: { $sum: "$quantityDelta" },
                positiveQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $gt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
                negativeQuantityDelta: {
                  $sum: {
                    $cond: [
                      { $lt: ["$quantityDelta", 0] },
                      "$quantityDelta",
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { overrideCount: -1, quantityDelta: -1 } },
            {
              $lookup: {
                from: "users",
                localField: "_id.actedBy",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $lookup: {
                from: "customers",
                localField: "_id.customer",
                foreignField: "_id",
                as: "customer",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$customer",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                userId: { $toString: "$_id.actedBy" },
                customerId: { $toString: "$_id.customer" },
                username: "$user.username",
                userFirstName: "$user.firstName",
                userLastName: "$user.lastName",
                customerFirstName: "$customer.firstName",
                customerLastName: "$customer.lastName",
                overrideCount: 1,
                quantityDelta: 1,
                positiveQuantityDelta: 1,
                negativeQuantityDelta: 1,
              },
            },
          ],
        },
      },
    ]);

    return {
      summary:
        result[0]?.summary?.[0] ?? {
          totalOverrides: 0,
          quantityDelta: 0,
          positiveQuantityDelta: 0,
          negativeQuantityDelta: 0,
          usersAffected: 0,
          customersAffected: 0,
        },
      byUser: result[0]?.byUser ?? [],
      byCustomer: result[0]?.byCustomer ?? [],
      byUserCustomer: result[0]?.byUserCustomer ?? [],
    };
  }
}