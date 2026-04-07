import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Types } from "mongoose";
import { CustomersService } from "../customers/customers.service";
import { DeliveriesService } from "../deliveries/deliveries.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeService } from "../realtime/realtime.service";
import { InventoryService } from "../inventory/inventory.service";
import { Order } from "./entities/order.entity";
import { OrdersService } from "./orders.service";

const makeObjectId = () => new Types.ObjectId().toString();

const makeInventoryItem = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  name: "18L Water Bottle",
  sku: "WATER-18L",
  sellingPrice: 10,
  refillPrice: 5,
  stockQuantity: 100,
  lowStockThreshold: 10,
  isRefillable: true,
  isActive: true,
  ...overrides,
});

const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  addresses: [],
  wallet: { storeCredit: 0, prepaidItems: [] },
  ...overrides,
});

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  orderNumber: "ORD-1234567890",
  customer: new Types.ObjectId(),
  items: [],
  refills: [],
  refillCount: 0,
  subTotal: 10,
  discount: 0,
  grandTotal: 10,
  amountPaid: 10,
  paymentMethod: "cash",
  status: "completed",
  paymentStatus: "paid",
  isDelivery: false,
  isPrepaidRedemption: false,
  emailReceipt: false,
  ...overrides,
});

const makeChainable = (resolvedValue: unknown) => {
  const chain: any = { populate: jest.fn(), exec: jest.fn().mockResolvedValue(resolvedValue) };
  chain.populate.mockReturnValue(chain);
  return chain;
};

function buildMockOrderModel() {
  const savedOrder = { ...makeOrder(), _id: new Types.ObjectId() };
  const MockModel: any = jest.fn().mockImplementation(function (dto: any) {
    Object.assign(this, dto);
    this._id = savedOrder._id;
    this.save = jest.fn().mockResolvedValue(savedOrder);
  });
  MockModel.find = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();
  MockModel.aggregate = jest.fn();
  return MockModel;
}

describe("OrdersService", () => {
  let service: OrdersService;
  let mockOrderModel: ReturnType<typeof buildMockOrderModel>;

  const mockInventoryService = { findOne: jest.fn(), update: jest.fn() };
  const mockCustomersService = { findOne: jest.fn(), update: jest.fn() };
  const mockDeliveriesService = { create: jest.fn() };
  const mockNotificationsService = { createIfNotExists: jest.fn(), create: jest.fn() };
  const mockRealtimeService = { emitDashboardUpdate: jest.fn() };

  beforeEach(async () => {
    mockOrderModel = buildMockOrderModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: DeliveriesService, useValue: mockDeliveriesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe("create()", () => {
    const customerId = makeObjectId();
    const itemId = makeObjectId();

    beforeEach(() => {
      mockCustomersService.findOne.mockResolvedValue(makeCustomer({ _id: new Types.ObjectId(customerId) }));
      mockInventoryService.findOne.mockResolvedValue(makeInventoryItem({ _id: new Types.ObjectId(itemId) }));
      mockInventoryService.update.mockResolvedValue({});
      mockNotificationsService.createIfNotExists.mockResolvedValue({});
      mockCustomersService.update.mockResolvedValue({});
    });

    it("deducts stock and emits realtime event", async () => {
      await service.create({ customerId, items: [{ itemId, quantity: 2 }], paymentMethod: "cash", discount: 0 } as any);
      expect(mockInventoryService.update).toHaveBeenCalledWith(itemId, { stockQuantity: 98 });
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("orders.created");
    });

    it("throws BadRequestException when stock is insufficient", async () => {
      mockInventoryService.findOne.mockResolvedValue(makeInventoryItem({ stockQuantity: 1 }));
      await expect(
        service.create({ customerId, items: [{ itemId, quantity: 5 }], paymentMethod: "cash", discount: 0 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockInventoryService.update).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when prepaid credits are insufficient", async () => {
      mockCustomersService.findOne.mockResolvedValue(makeCustomer({ wallet: { storeCredit: 0, prepaidItems: [] } }));
      await expect(
        service.create({ customerId, items: [{ itemId, quantity: 1, isPrepaidRedemption: true }], paymentMethod: "credit_redemption", isPrepaidRedemption: true, discount: 0 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("fires out-of-stock notification when stock hits zero", async () => {
      mockInventoryService.findOne.mockResolvedValue(makeInventoryItem({ stockQuantity: 1 }));
      await service.create({ customerId, items: [{ itemId, quantity: 1 }], paymentMethod: "cash", discount: 0 } as any);
      expect(mockNotificationsService.createIfNotExists).toHaveBeenCalledWith(expect.objectContaining({ type: "out_of_stock" }));
    });

    it("fires low-stock notification when stock falls below threshold", async () => {
      mockInventoryService.findOne.mockResolvedValue(makeInventoryItem({ stockQuantity: 11, lowStockThreshold: 10 }));
      await service.create({ customerId, items: [{ itemId, quantity: 2 }], paymentMethod: "cash", discount: 0 } as any);
      expect(mockNotificationsService.createIfNotExists).toHaveBeenCalledWith(expect.objectContaining({ type: "low_stock" }));
    });

    it("applies discount correctly to grandTotal", async () => {
      let capturedDto: any;
      mockOrderModel.mockImplementation(function (dto: any) {
        capturedDto = dto;
        this._id = new Types.ObjectId();
        this.save = jest.fn().mockResolvedValue({ ...dto, _id: this._id });
        Object.assign(this, dto);
      });
      await service.create({ customerId, items: [{ itemId, quantity: 1 }], paymentMethod: "cash", discount: 3 } as any);
      expect(capturedDto.grandTotal).toBe(7); // 10 - 3
    });

    it("creates a delivery record when isDelivery=true", async () => {
      const customerWithAddress = makeCustomer({ addresses: [{ street: "123 Water St", city: "Town", isDefault: true }] });
      mockCustomersService.findOne.mockResolvedValue(customerWithAddress);
      mockDeliveriesService.create.mockResolvedValue({ _id: new Types.ObjectId() });
      mockOrderModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await service.create({ customerId, items: [{ itemId, quantity: 1 }], paymentMethod: "cash", isDelivery: true, deliveryDate: new Date().toISOString(), discount: 0 } as any);
      expect(mockDeliveriesService.create).toHaveBeenCalled();
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe("findAll()", () => {
    it("returns all orders without year filter", async () => {
      mockOrderModel.find.mockReturnValue(makeChainable([makeOrder()]));
      await service.findAll();
      expect(mockOrderModel.find).toHaveBeenCalledWith({});
    });

    it("filters by year when provided", async () => {
      mockOrderModel.find.mockReturnValue(makeChainable([]));
      await service.findAll(2024);
      const filter = mockOrderModel.find.mock.calls[0][0];
      expect(filter.createdAt.$gte).toEqual(new Date("2024-01-01"));
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe("findOne()", () => {
    it("returns order when found", async () => {
      const order = makeOrder();
      mockOrderModel.findById.mockReturnValue(makeChainable(order));
      expect(await service.findOne("order-id")).toEqual(order);
    });

    it("throws NotFoundException when not found", async () => {
      mockOrderModel.findById.mockReturnValue(makeChainable(null));
      await expect(service.findOne("ghost")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────
  describe("updateStatus()", () => {
    it("updates status", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder({ status: "cancelled" })));
      await service.updateStatus("order-id", "cancelled");
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("orders.status_updated");
    });

    it("throws NotFoundException when not found", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(null));
      await expect(service.updateStatus("ghost", "completed")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe("update()", () => {
    beforeEach(() => {
      mockOrderModel.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(makeOrder({ subTotal: 20, discount: 0, grandTotal: 20, amountPaid: 20 })) });
    });

    it("recalculates grandTotal with new discount", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder({ grandTotal: 15 })));
      await service.update("order-id", { discount: 5 } as any);
      const updates = mockOrderModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updates.grandTotal).toBe(15); // 20 - 5
    });

    it("sets paymentStatus=paid when fully paid", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder()));
      await service.update("order-id", { paymentDetails: { mode: "single", amount: 20 } } as any);
      expect(mockOrderModel.findByIdAndUpdate.mock.calls[0][1].paymentStatus).toBe("paid");
    });

    it("sets paymentStatus=partial when partially paid", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder()));
      await service.update("order-id", { paymentDetails: { mode: "single", amount: 10 } } as any);
      expect(mockOrderModel.findByIdAndUpdate.mock.calls[0][1].paymentStatus).toBe("partial");
    });

    it("sets paymentStatus=unpaid when nothing paid", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder()));
      await service.update("order-id", { paymentDetails: { mode: "single", amount: 0 } } as any);
      expect(mockOrderModel.findByIdAndUpdate.mock.calls[0][1].paymentStatus).toBe("unpaid");
    });

    it("handles split payments correctly", async () => {
      mockOrderModel.findByIdAndUpdate.mockReturnValue(makeChainable(makeOrder()));
      await service.update("order-id", { paymentDetails: { mode: "split", payments: [{ type: "cash", amount: 10 }, { type: "card", amount: 10 }] } } as any);
      expect(mockOrderModel.findByIdAndUpdate.mock.calls[0][1].paymentStatus).toBe("paid");
    });

    it("throws NotFoundException when order not found", async () => {
      mockOrderModel.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.update("ghost", {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────
  describe("remove()", () => {
    it("deletes and returns the order", async () => {
      const order = makeOrder();
      mockOrderModel.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
      const result = await service.remove("order-id");
      expect(result).toEqual(order);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("orders.removed");
    });

    it("throws NotFoundException when not found", async () => {
      mockOrderModel.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.remove("ghost")).rejects.toThrow(NotFoundException);
    });
  });
});

