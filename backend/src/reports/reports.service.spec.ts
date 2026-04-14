import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ReportsService } from "./reports.service";
import { Order } from "../orders/entities/order.entity";
import { RefillOverride } from "../refill-overrides/entities/refill-override.entity";

const mockOrderModel = {
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockRefillOverrideModel = {
  aggregate: jest.fn(),
};

describe("ReportsService", () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        {
          provide: getModelToken(RefillOverride.name),
          useValue: mockRefillOverrideModel,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboardStats()", () => {
    it("returns zero stats when no orders exist", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);
      const result = await service.getDashboardStats();
      expect(result).toEqual({
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
      });
    });

    it("returns aggregated stats when orders exist", async () => {
      mockOrderModel.aggregate.mockResolvedValue([
        {
          overview: [
            {
              totalRevenue: 500,
              totalOrders: 10,
              avgOrderValue: 50,
              todayRevenue: 125,
              todayOrders: 3,
              todayDeliveryOrders: 1,
              todayPrepaidOrders: 2,
              deliveryOrders: 4,
              walkInOrders: 6,
              prepaidRedemptions: 2,
              refillCount: 9,
            },
          ],
          customerSummary: [
            {
              uniqueCustomersServed: 4,
              repeatCustomers: 2,
            },
          ],
          salesTrend: [
            {
              _id: "2026-04",
              revenue: 500,
              orders: 10,
            },
          ],
        },
      ]);

      const result = await service.getDashboardStats();
      expect(result).toEqual({
        totalRevenue: 500,
        totalOrders: 10,
        avgOrderValue: 50,
        todayRevenue: 125,
        todayOrders: 3,
        todayDeliveryOrders: 1,
        todayPrepaidOrders: 2,
        uniqueCustomersServed: 4,
        repeatCustomers: 2,
        repeatCustomerRate: 50,
        deliveryOrders: 4,
        walkInOrders: 6,
        walkInPercentage: 60,
        prepaidRedemptions: 2,
        refillCount: 9,
        salesTrend: [
          {
            label: "Apr 2026",
            revenue: 500,
            orders: 10,
          },
        ],
      });
    });

    it("passes a year match stage when year is provided", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);
      await service.getDashboardStats({ year: 2024 });
      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.createdAt.$gte).toEqual(new Date("2024-01-01"));
    });

    it("builds a store-local from/to date expression when an explicit range is provided", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);

      await service.getDashboardStats({ from: "2026-04-01", to: "2026-04-30" });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.$expr.$and).toEqual([
        {
          $gte: [
            {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "America/Toronto",
              },
            },
            "2026-04-01",
          ],
        },
        {
          $lte: [
            {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "America/Toronto",
              },
            },
            "2026-04-30",
          ],
        },
      ]);
    });

    it("uses an America/Toronto day key for today-scoped metrics", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);

      await service.getDashboardStats(undefined, new Date("2026-04-11T03:30:00.000Z"));

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[1]).toEqual({
        $match: {
          status: { $ne: "cancelled" },
        },
      });
      expect(pipeline[2].$facet.overview[0].$group.todayOrders.$sum.$cond[0].$eq[0].$dateToString.timezone).toBe("America/Toronto");
      expect(pipeline[2].$facet.overview[0].$group.todayOrders.$sum.$cond[0].$eq[1]).toBe("2026-04-10");
    });

    it("excludes cancelled orders from dashboard metrics", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);

      await service.getDashboardStats();

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[1]).toEqual({
        $match: {
          status: { $ne: "cancelled" },
        },
      });
    });
  });

  describe("getTopSellingItems()", () => {
    it("returns an array of top selling items", async () => {
      const items = [{ _id: "item-1", name: "18L Bottle", totalSold: 50 }];
      mockOrderModel.aggregate.mockResolvedValue(items);
      const result = await service.getTopSellingItems();
      expect(result).toEqual(items);
    });

    it("accepts explicit date-range filters", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);

      await service.getTopSellingItems({ from: "2026-04-01", to: "2026-04-30" });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.$expr).toBeDefined();
    });
  });

  describe("getTopCustomers()", () => {
    it("returns an array of top customers", async () => {
      const customers = [{ _id: "cust-1", firstName: "John", totalSpent: 200 }];
      mockOrderModel.aggregate.mockResolvedValue(customers);
      const result = await service.getTopCustomers();
      expect(result).toEqual(customers);
    });
  });

  describe("getFrequentCustomers()", () => {
    it("returns an array of frequent customers", async () => {
      const customers = [{ _id: "cust-1", firstName: "Jane", visitCount: 15 }];
      mockOrderModel.aggregate.mockResolvedValue(customers);
      const result = await service.getFrequentCustomers();
      expect(result).toEqual(customers);
    });
  });

  describe("getWalkInStats()", () => {
    it("returns totals and monthly breakdown for the selected range", async () => {
      mockOrderModel.aggregate.mockResolvedValue([
        {
          totals: [
            {
              totalOrders: 2,
              totalRevenue: 45,
              avgOrderValue: 22.5,
            },
          ],
          monthly: [
            {
              _id: "2026-04",
              orders: 2,
              revenue: 45,
            },
          ],
        },
      ]);
      mockOrderModel.countDocuments.mockResolvedValue(10);

      const result = await service.getWalkInStats({ from: "2026-04-01", to: "2026-04-30" });

      expect(result).toEqual({
        totalWalkInOrders: 2,
        walkInRevenue: 45,
        avgWalkInOrderValue: 22.5,
        totalOrders: 10,
        walkInPercentage: 20,
        monthlyBreakdown: [
          {
            month: "Apr 2026",
            orders: 2,
            revenue: 45,
          },
        ],
      });
    });
  });

  describe("getRefillOverrideStats()", () => {
    it("returns grouped override analytics", async () => {
      mockRefillOverrideModel.aggregate.mockResolvedValue([
        {
          summary: [
            {
              totalOverrides: 3,
              quantityDelta: 2,
              positiveQuantityDelta: 4,
              negativeQuantityDelta: -2,
              usersAffected: 2,
              customersAffected: 2,
            },
          ],
          byUser: [
            {
              userId: "user-1",
              username: "staff1",
              overrideCount: 2,
              quantityDelta: 3,
              positiveQuantityDelta: 4,
              negativeQuantityDelta: -1,
              customersAffected: 2,
            },
          ],
          byCustomer: [
            {
              customerId: "customer-1",
              firstName: "Jane",
              lastName: "Smith",
              overrideCount: 2,
              quantityDelta: 1,
              positiveQuantityDelta: 2,
              negativeQuantityDelta: -1,
              usersAffected: 1,
            },
          ],
          byUserCustomer: [
            {
              userId: "user-1",
              customerId: "customer-1",
              username: "staff1",
              overrideCount: 2,
              quantityDelta: 1,
              positiveQuantityDelta: 2,
              negativeQuantityDelta: -1,
            },
          ],
        },
      ]);

      const result = await service.getRefillOverrideStats({
        from: "2026-04-01",
        to: "2026-04-30",
      });

      expect(result.summary.totalOverrides).toBe(3);
      expect(result.byUser).toHaveLength(1);
      expect(result.byCustomer).toHaveLength(1);
      expect(result.byUserCustomer).toHaveLength(1);
    });
  });
});
