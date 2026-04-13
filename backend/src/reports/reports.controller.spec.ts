import { Test, TestingModule } from "@nestjs/testing";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

const mockReportsService = {
  getDashboardStats: jest.fn(),
  getTopSellingItems: jest.fn(),
  getTopCustomers: jest.fn(),
  getFrequentCustomers: jest.fn(),
  getWalkInStats: jest.fn(),
  getRefillOverrideStats: jest.fn(),
};

describe("ReportsController", () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getDashboardStats()", () => {
    it("delegates to ReportsService.getDashboardStats without filters", async () => {
      mockReportsService.getDashboardStats.mockResolvedValue({
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

      await controller.getDashboardStats();

      expect(mockReportsService.getDashboardStats).toHaveBeenCalledWith({
        year: undefined,
        from: undefined,
        to: undefined,
      });
    });

    it("parses year and range query params and delegates", async () => {
      mockReportsService.getDashboardStats.mockResolvedValue({
        totalRevenue: 1000,
        totalOrders: 12,
        avgOrderValue: 83.33,
        todayRevenue: 150,
        todayOrders: 2,
        todayDeliveryOrders: 1,
        todayPrepaidOrders: 0,
        uniqueCustomersServed: 5,
        repeatCustomers: 2,
        repeatCustomerRate: 40,
        deliveryOrders: 3,
        walkInOrders: 4,
        walkInPercentage: 33,
        prepaidRedemptions: 1,
        refillCount: 8,
        salesTrend: [],
      });

      await controller.getDashboardStats("2024", "2024-01-01", "2024-01-31");

      expect(mockReportsService.getDashboardStats).toHaveBeenCalledWith({
        year: 2024,
        from: "2024-01-01",
        to: "2024-01-31",
      });
    });
  });

  describe("getTopSellingItems()", () => {
    it("delegates to ReportsService.getTopSellingItems", async () => {
      mockReportsService.getTopSellingItems.mockResolvedValue([]);

      await controller.getTopSellingItems("2024", "2024-01-01", "2024-01-31");

      expect(mockReportsService.getTopSellingItems).toHaveBeenCalledWith({
        year: 2024,
        from: "2024-01-01",
        to: "2024-01-31",
      });
    });
  });

  describe("getTopCustomers()", () => {
    it("delegates to ReportsService.getTopCustomers", async () => {
      mockReportsService.getTopCustomers.mockResolvedValue([]);
      await controller.getTopCustomers();

      expect(mockReportsService.getTopCustomers).toHaveBeenCalledWith({
        year: undefined,
        from: undefined,
        to: undefined,
      });
    });
  });

  describe("getFrequentCustomers()", () => {
    it("delegates to ReportsService.getFrequentCustomers", async () => {
      mockReportsService.getFrequentCustomers.mockResolvedValue([]);
      await controller.getFrequentCustomers();

      expect(mockReportsService.getFrequentCustomers).toHaveBeenCalledWith({
        year: undefined,
        from: undefined,
        to: undefined,
      });
    });
  });

  describe("getWalkInStats()", () => {
    it("delegates to ReportsService.getWalkInStats with shared filters", async () => {
      mockReportsService.getWalkInStats.mockResolvedValue({
        totalWalkInOrders: 0,
        walkInRevenue: 0,
        avgWalkInOrderValue: 0,
        totalOrders: 0,
        walkInPercentage: 0,
        monthlyBreakdown: [],
      });

      await controller.getWalkInStats("2024", "2024-01-01", "2024-01-31");

      expect(mockReportsService.getWalkInStats).toHaveBeenCalledWith({
        year: 2024,
        from: "2024-01-01",
        to: "2024-01-31",
      });
    });
  });

  describe("getRefillOverrideStats()", () => {
    it("delegates to ReportsService.getRefillOverrideStats with shared filters", async () => {
      mockReportsService.getRefillOverrideStats.mockResolvedValue({
        summary: {
          totalOverrides: 0,
          quantityDelta: 0,
          positiveQuantityDelta: 0,
          negativeQuantityDelta: 0,
          usersAffected: 0,
          customersAffected: 0,
        },
        byUser: [],
        byCustomer: [],
        byUserCustomer: [],
      });

      await controller.getRefillOverrideStats("2024", "2024-01-01", "2024-01-31");

      expect(mockReportsService.getRefillOverrideStats).toHaveBeenCalledWith({
        year: 2024,
        from: "2024-01-01",
        to: "2024-01-31",
      });
    });
  });
});
