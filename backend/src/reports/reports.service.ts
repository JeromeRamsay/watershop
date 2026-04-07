import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDocument } from "../orders/entities/order.entity";

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface WalkInStats {
  totalWalkInOrders: number;
  walkInRevenue: number;
  avgWalkInOrderValue: number;
  totalOrders: number;
  walkInPercentage: number;
  monthlyBreakdown: { month: string; orders: number; revenue: number }[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  // 1. Dashboard Overview (Total Sales, Count, etc.)
  async getDashboardStats(year?: number): Promise<DashboardStats> {
    const matchStage = year
      ? {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31T23:59:59.999Z`),
            },
          },
        }
      : { $match: {} };

    const stats = await this.orderModel.aggregate<DashboardStats>([
      matchStage,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$grandTotal" },
        },
      },
    ]);

    return stats.length > 0
      ? (stats[0] as DashboardStats)
      : { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
  }

  // 2. Top 5 Selling Items (Most Purchased)
  async getTopSellingItems(year?: number): Promise<any[]> {
    const matchStage = year
      ? {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31T23:59:59.999Z`),
            },
          },
        }
      : { $match: {} };

    return this.orderModel.aggregate([
      matchStage,
      { $unwind: "$items" }, // Break order array into individual item rows
      {
        $group: {
          _id: "$items.item", // Group by Item ID
          name: { $first: "$items.name" }, // Get name
          totalSold: { $sum: "$items.quantity" }, // Sum quantities
          revenueGenerated: { $sum: "$items.totalPrice" }, // Sum revenue
        },
      },
      { $sort: { totalSold: -1 } }, // Sort Highest to Lowest
      { $limit: 5 }, // Top 5 only
    ]);
  }

  // 3. Top 5 Customers (By Money Spent)
  async getTopCustomers(year?: number) {
    const matchStage = year
      ? {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31T23:59:59.999Z`),
            },
          },
        }
      : { $match: {} };

    return this.orderModel.aggregate([
      matchStage,
      {
        $group: {
          _id: "$customer",
          totalSpent: { $sum: "$grandTotal" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      // Join with Customers collection to get names
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
  async getWalkInStats(year?: number): Promise<WalkInStats> {
    const dateFilter = year
      ? {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        }
      : {};

    interface WalkInTotals {
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
    }
    interface WalkInMonthly {
      _id: number;
      orders: number;
      revenue: number;
    }
    interface WalkInFacet {
      totals: WalkInTotals[];
      monthly: WalkInMonthly[];
    }

    const [walkInResult, totalOrders] = await Promise.all([
      this.orderModel.aggregate<WalkInFacet>([
        { $match: { ...dateFilter, isWalkIn: true } },
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
                  _id: { $month: "$createdAt" },
                  orders: { $sum: 1 },
                  revenue: { $sum: "$grandTotal" },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
      this.orderModel.countDocuments(dateFilter),
    ]);

    const totals: WalkInTotals = walkInResult[0]?.totals[0] ?? {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
    };

    const monthNames = [
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
    const monthlyMap = new Map<number, { orders: number; revenue: number }>();
    for (const m of walkInResult[0]?.monthly ?? []) {
      monthlyMap.set(m._id, { orders: m.orders, revenue: m.revenue });
    }
    const monthlyBreakdown = monthNames.map((month, index) => {
      const data = monthlyMap.get(index + 1) ?? { orders: 0, revenue: 0 };
      return { month, orders: data.orders, revenue: data.revenue };
    });

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
  async getFrequentCustomers(year?: number) {
    const matchStage = year
      ? {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31T23:59:59.999Z`),
            },
          },
        }
      : { $match: {} };

    return this.orderModel.aggregate([
      matchStage,
      {
        $group: {
          _id: "$customer",
          visitCount: { $sum: 1 }, // Count orders
          totalSpent: { $sum: "$grandTotal" },
        },
      },
      { $sort: { visitCount: -1 } }, // Sort by Visits
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
}
