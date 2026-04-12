import { Test, TestingModule } from "@nestjs/testing";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

const mockReportsService = {
  getDashboardStats: jest.fn(),
  getTopSellingItems: jest.fn(),
  getTopCustomers: jest.fn(),
  getFrequentCustomers: jest.fn(),
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
    it("delegates to ReportsService.getDashboardStats without year", async () => {
      mockReportsService.getDashboardStats.mockResolvedValue({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        todayRevenue: 0,
        todayOrders: 0,
        todayDeliveryOrders: 0,
        todayPrepaidOrders: 0,
      });
      await controller.getDashboardStats();
      expect(mockReportsService.getDashboardStats).toHaveBeenCalledWith(undefined);
    });

    it("parses year query param and delegates", async () => {
      mockReportsService.getDashboardStats.mockResolvedValue({
        totalRevenue: 1000,
        totalOrders: 12,
        avgOrderValue: 83.33,
        todayRevenue: 150,
        todayOrders: 2,
        todayDeliveryOrders: 1,
        todayPrepaidOrders: 0,
      });
      await controller.getDashboardStats("2024");
      expect(mockReportsService.getDashboardStats).toHaveBeenCalledWith(2024);
    });
  });

  describe("getTopSellingItems()", () => {
    it("delegates to ReportsService.getTopSellingItems", async () => {
      mockReportsService.getTopSellingItems.mockResolvedValue([]);
      await controller.getTopSellingItems("2024");
      expect(mockReportsService.getTopSellingItems).toHaveBeenCalledWith(2024);
    });
  });

  describe("getTopCustomers()", () => {
    it("delegates to ReportsService.getTopCustomers", async () => {
      mockReportsService.getTopCustomers.mockResolvedValue([]);
      await controller.getTopCustomers();
      expect(mockReportsService.getTopCustomers).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getFrequentCustomers()", () => {
    it("delegates to ReportsService.getFrequentCustomers", async () => {
      mockReportsService.getFrequentCustomers.mockResolvedValue([]);
      await controller.getFrequentCustomers();
      expect(mockReportsService.getFrequentCustomers).toHaveBeenCalledWith(undefined);
    });
  });
});
