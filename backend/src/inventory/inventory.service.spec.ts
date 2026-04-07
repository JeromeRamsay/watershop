import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { RealtimeService } from "../realtime/realtime.service";
import { Inventory } from "./entities/inventory.entity";
import { InventoryService } from "./inventory.service";

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  _id: "item-id-1",
  name: "18L Water Bottle",
  sku: "WATER-18L",
  category: "Water",
  stockQuantity: 50,
  sellingPrice: 10,
  purchasePrice: 6,
  unitType: "piece",
  isActive: true,
  lowStockThreshold: 10,
  isRefillable: false,
  refillPrice: 0,
  ...overrides,
});

function buildMockInventoryModel() {
  const MockModel: any = jest.fn().mockImplementation(function (dto: any) {
    Object.assign(this, dto);
    this.save = jest.fn().mockResolvedValue({ ...dto, _id: "new-item-id" });
  });
  MockModel.findOne = jest.fn();
  MockModel.find = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  return MockModel;
}

describe("InventoryService", () => {
  let service: InventoryService;
  let mockInventoryModel: ReturnType<typeof buildMockInventoryModel>;

  const mockRealtimeService = { emitDashboardUpdate: jest.fn() };

  beforeEach(async () => {
    mockInventoryModel = buildMockInventoryModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(Inventory.name), useValue: mockInventoryModel },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe("create()", () => {
    const dto = { name: "18L Bottle", sku: "WATER-18L", category: "Water", stockQuantity: 50, sellingPrice: 10, purchasePrice: 6, unitType: "piece" };

    it("creates and returns the new inventory item", async () => {
      mockInventoryModel.findOne.mockReturnValue({ exec: undefined }); // No await needed, use resolved
      mockInventoryModel.findOne.mockResolvedValue(null);
      const saved = makeItem();
      const instance = { ...dto, save: jest.fn().mockResolvedValue(saved) };
      mockInventoryModel.mockImplementation(() => instance);

      const result = await service.create(dto as any);

      expect(instance.save).toHaveBeenCalled();
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("inventory.created");
      expect(result).toEqual(saved);
    });

    it("throws BadRequestException when SKU already exists", async () => {
      mockInventoryModel.findOne.mockResolvedValue(makeItem());

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe("findAll()", () => {
    it("returns only active items", async () => {
      const items = [makeItem(), makeItem({ sku: "WATER-10L" })];
      mockInventoryModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(items) });

      const result = await service.findAll();

      expect(mockInventoryModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(items);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe("findOne()", () => {
    it("returns the item when found and active", async () => {
      const item = makeItem();
      mockInventoryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(item) });

      const result = await service.findOne("item-id-1");

      expect(mockInventoryModel.findOne).toHaveBeenCalledWith({ _id: "item-id-1", isActive: true });
      expect(result).toEqual(item);
    });

    it("throws NotFoundException for inactive item (soft-deleted)", async () => {
      mockInventoryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne("deleted-item-id")).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockInventoryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne("nonexistent-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe("update()", () => {
    it("updates and returns the item", async () => {
      const updated = makeItem({ stockQuantity: 80 });
      mockInventoryModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

      const result = await service.update("item-id-1", { stockQuantity: 80 } as any);

      expect(mockInventoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "item-id-1",
        { stockQuantity: 80 },
        { new: true },
      );
      expect(result).toEqual(updated);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("inventory.updated");
    });

    it("throws NotFoundException when item not found", async () => {
      mockInventoryModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update("ghost-id", {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove (soft-delete) ──────────────────────────────────────────────────
  describe("remove()", () => {
    it("soft-deletes the item by setting isActive=false", async () => {
      const softDeleted = makeItem({ isActive: false });
      mockInventoryModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(softDeleted) });

      const result = await service.remove("item-id-1");

      expect(mockInventoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "item-id-1",
        { isActive: false },
        { new: true },
      );
      expect(result).toEqual(softDeleted);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("inventory.removed");
    });

    it("throws NotFoundException when item not found", async () => {
      mockInventoryModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove("ghost-id")).rejects.toThrow(NotFoundException);
    });

    it("does NOT permanently delete the record from the database", async () => {
      mockInventoryModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(makeItem({ isActive: false })) });

      await service.remove("item-id-1");

      // Should use findByIdAndUpdate not findByIdAndDelete
      expect(mockInventoryModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});

