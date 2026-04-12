import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ReportsService } from "./reports.service";
import { Order } from "../orders/entities/order.entity";

const mockOrderModel = {
  aggregate: jest.fn(),
};

describe("ReportsService", () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
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
      });
    });

    it("returns aggregated stats when orders exist", async () => {
      const stats = {
        totalRevenue: 500,
        totalOrders: 10,
        avgOrderValue: 50,
        todayRevenue: 125,
        todayOrders: 3,
        todayDeliveryOrders: 1,
        todayPrepaidOrders: 2,
      };
      mockOrderModel.aggregate.mockResolvedValue([stats]);
      const result = await service.getDashboardStats();
      expect(result).toEqual(stats);
    });

    it("passes a year match stage when year is provided", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);
      await service.getDashboardStats(2024);
      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.createdAt.$gte).toEqual(new Date("2024-01-01"));
    });

    it("uses an America/Toronto day key for today-scoped metrics", async () => {
      mockOrderModel.aggregate.mockResolvedValue([]);

      await service.getDashboardStats(undefined, new Date("2026-04-11T03:30:00.000Z"));

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[1].$group.todayOrders.$sum.$cond[0].$eq[0].$dateToString.timezone).toBe("America/Toronto");
      expect(pipeline[1].$group.todayOrders.$sum.$cond[0].$eq[1]).toBe("2026-04-10");
    });
  });

  describe("getTopSellingItems()", () => {
    it("returns an array of top selling items", async () => {
      const items = [{ _id: "item-1", name: "18L Bottle", totalSold: 50 }];
      mockOrderModel.aggregate.mockResolvedValue(items);
      const result = await service.getTopSellingItems();
      expect(result).toEqual(items);
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
});
