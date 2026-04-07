import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { RealtimeService } from "../realtime/realtime.service";
import { Customer } from "./entities/customer.entity";
import { CustomersService } from "./customers.service";

const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
  _id: "customer-id-1",
  type: "individual",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "555-0001",
  addresses: [],
  familyMembers: [],
  wallet: { storeCredit: 0, prepaidItems: [] },
  ...overrides,
});

const makeChainable = (resolvedValue: unknown) => {
  const chain: any = { sort: jest.fn(), exec: jest.fn().mockResolvedValue(resolvedValue) };
  chain.sort.mockReturnValue(chain);
  return chain;
};

function buildMockCustomerModel() {
  const MockModel: any = jest.fn().mockImplementation(function (dto: any) {
    Object.assign(this, dto);
    this.save = jest.fn().mockResolvedValue({ ...dto, _id: "new-customer-id" });
  });
  MockModel.find = jest.fn();
  MockModel.findOne = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();
  MockModel.aggregate = jest.fn();
  return MockModel;
}

describe("CustomersService", () => {
  let service: CustomersService;
  let mockCustomerModel: ReturnType<typeof buildMockCustomerModel>;

  const mockRealtimeService = { emitDashboardUpdate: jest.fn() };

  beforeEach(async () => {
    mockCustomerModel = buildMockCustomerModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe("create()", () => {
    const dto = { type: "individual", firstName: "Jane", lastName: "Smith", email: "jane@example.com", phone: "555-0001" };

    it("creates and returns a new customer", async () => {
      const saved = makeCustomer();
      const instance = { ...dto, save: jest.fn().mockResolvedValue(saved) };
      mockCustomerModel.mockImplementation(() => instance);

      const result = await service.create(dto as any);

      expect(instance.save).toHaveBeenCalled();
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("customers.created");
      expect(result).toEqual(saved);
    });

    it("throws BadRequestException on duplicate email", async () => {
      const instance = { ...dto, save: jest.fn().mockRejectedValue({ code: 11000, keyPattern: { email: 1 } }) };
      mockCustomerModel.mockImplementation(() => instance);

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException on duplicate phone", async () => {
      const instance = { ...dto, save: jest.fn().mockRejectedValue({ code: 11000, keyPattern: { phone: 1 } }) };
      mockCustomerModel.mockImplementation(() => instance);

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it("re-throws non-duplicate errors", async () => {
      const instance = { ...dto, save: jest.fn().mockRejectedValue(new Error("DB connection lost")) };
      mockCustomerModel.mockImplementation(() => instance);

      await expect(service.create(dto as any)).rejects.toThrow("DB connection lost");
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe("findAll()", () => {
    it("returns all customers sorted by createdAt desc", async () => {
      const customers = [makeCustomer()];
      mockCustomerModel.find.mockReturnValue(makeChainable(customers));

      const result = await service.findAll();

      expect(mockCustomerModel.find).toHaveBeenCalled();
      expect(result).toEqual(customers);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe("findOne()", () => {
    it("returns the customer when found", async () => {
      const customer = makeCustomer();
      mockCustomerModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(customer) });

      const result = await service.findOne("customer-id-1");

      expect(result).toEqual(customer);
    });

    it("throws NotFoundException when customer not found", async () => {
      mockCustomerModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne("ghost-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── search ────────────────────────────────────────────────────────────────
  describe("search()", () => {
    it("searches by firstName, lastName, and phone with case-insensitive regex", async () => {
      const customers = [makeCustomer()];
      mockCustomerModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(customers) });

      const result = await service.search("jane");

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
      expect(result).toEqual(customers);
    });
  });

  // ─── findByPhone ───────────────────────────────────────────────────────────
  describe("findByPhone()", () => {
    it("returns null for empty/non-digit phone", async () => {
      const result = await service.findByPhone("");
      expect(result).toBeNull();
      expect(mockCustomerModel.findOne).not.toHaveBeenCalled();
    });

    it("performs regex search for valid phone digits", async () => {
      const customer = makeCustomer();
      mockCustomerModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(customer) });

      const result = await service.findByPhone("555-0001");

      expect(mockCustomerModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ phone: expect.objectContaining({ $regex: expect.any(RegExp) }) }),
      );
      expect(result).toEqual(customer);
    });

    it("returns null when no customer found for that phone", async () => {
      mockCustomerModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findByPhone("999-0000");

      expect(result).toBeNull();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe("update()", () => {
    it("updates and returns the customer", async () => {
      const updated = makeCustomer({ firstName: "Updated" });
      mockCustomerModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

      const result = await service.update("customer-id-1", { firstName: "Updated" } as any);

      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "customer-id-1",
        { firstName: "Updated" },
        { new: true },
      );
      expect(result).toEqual(updated);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("customers.updated");
    });

    it("throws NotFoundException when customer not found", async () => {
      mockCustomerModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update("ghost-id", {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────
  describe("remove()", () => {
    it("deletes and returns the customer", async () => {
      const customer = makeCustomer();
      mockCustomerModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(customer) });

      const result = await service.remove("customer-id-1");

      expect(mockCustomerModel.findByIdAndDelete).toHaveBeenCalledWith("customer-id-1");
      expect(result).toEqual(customer);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("customers.removed");
    });

    it("throws NotFoundException when customer not found", async () => {
      mockCustomerModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove("ghost-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllPaginated ──────────────────────────────────────────────────────
  describe("findAllPaginated()", () => {
    it("returns paginated data with metadata", async () => {
      const mockResult = [
        {
          metadata: [{ total: 25 }],
          data: [makeCustomer()],
        },
      ];
      mockCustomerModel.aggregate.mockResolvedValue(mockResult);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.pagination.total).toBe(25);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.data).toEqual([makeCustomer()]);
    });

    it("returns empty results when no customers match", async () => {
      mockCustomerModel.aggregate.mockResolvedValue([{ metadata: [], data: [] }]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.pagination.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it("clamps page to a minimum of 1", async () => {
      mockCustomerModel.aggregate.mockResolvedValue([{ metadata: [], data: [] }]);

      const result = await service.findAllPaginated({ page: -5, limit: 10 });

      expect(result.pagination.page).toBe(1);
    });

    it("clamps limit to a maximum of 200", async () => {
      mockCustomerModel.aggregate.mockResolvedValue([{ metadata: [], data: [] }]);

      const result = await service.findAllPaginated({ page: 1, limit: 9999 });

      expect(result.pagination.limit).toBe(200);
    });
  });
});

