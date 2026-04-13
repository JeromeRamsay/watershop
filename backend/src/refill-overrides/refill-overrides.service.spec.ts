import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Customer } from "../customers/entities/customer.entity";
import { RealtimeService } from "../realtime/realtime.service";
import { RefillOverridesService } from "./refill-overrides.service";
import { RefillOverride } from "./entities/refill-override.entity";

function buildMockRefillOverrideModel() {
  const MockModel: any = jest.fn().mockImplementation(function (dto: any) {
    Object.assign(this, dto);
    this.save = jest.fn().mockResolvedValue({
      ...dto,
      _id: "override-id-1",
      createdAt: new Date("2026-04-12T15:00:00.000Z"),
    });
  });
  MockModel.aggregate = jest.fn();
  return MockModel;
}

describe("RefillOverridesService", () => {
  let service: RefillOverridesService;
  let mockRefillOverrideModel: ReturnType<typeof buildMockRefillOverrideModel>;
  const mockCustomerModel = {
    findById: jest.fn(),
  };
  const mockRealtimeService = { emitDashboardUpdate: jest.fn() };

  beforeEach(async () => {
    mockRefillOverrideModel = buildMockRefillOverrideModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefillOverridesService,
        { provide: getModelToken(RefillOverride.name), useValue: mockRefillOverrideModel },
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();

    service = module.get<RefillOverridesService>(RefillOverridesService);
    jest.clearAllMocks();
  });

  it("applies a positive override and updates the wallet", async () => {
    const customer = {
      _id: "customer-id-1",
      wallet: {
        storeCredit: 0,
        prepaidItems: [
          {
            itemId: { toString: () => "664f0f3ce2d8f2c3d4e5f777" },
            itemName: "18L Refill",
            quantityRemaining: 2,
          },
        ],
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockCustomerModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(customer),
    });

    const result = await service.create(
      {
        customerId: "664f0f3ce2d8f2c3d4e5f601",
        itemId: "664f0f3ce2d8f2c3d4e5f777",
        quantityDelta: 1,
        notes: "Courtesy refill",
      },
      "664f0f3ce2d8f2c3d4e5f999",
    );

    expect(customer.wallet.prepaidItems[0].quantityRemaining).toBe(3);
    expect(customer.save).toHaveBeenCalled();
    expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith(
      "customers.refill_overrides.updated",
    );
    expect(result.quantityRemaining).toBe(3);
  });

  it("rejects unauthenticated requests", async () => {
    await expect(
      service.create(
        {
          customerId: "664f0f3ce2d8f2c3d4e5f601",
          itemId: "664f0f3ce2d8f2c3d4e5f777",
          quantityDelta: 1,
        },
        undefined,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws when the customer is not found", async () => {
    mockCustomerModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.create(
        {
          customerId: "664f0f3ce2d8f2c3d4e5f601",
          itemId: "664f0f3ce2d8f2c3d4e5f777",
          quantityDelta: 1,
        },
        "664f0f3ce2d8f2c3d4e5f999",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws when the override would reduce balance below zero", async () => {
    const customer = {
      _id: "customer-id-1",
      wallet: {
        storeCredit: 0,
        prepaidItems: [
          {
            itemId: { toString: () => "664f0f3ce2d8f2c3d4e5f777" },
            itemName: "18L Refill",
            quantityRemaining: 1,
          },
        ],
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockCustomerModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(customer),
    });

    await expect(
      service.create(
        {
          customerId: "664f0f3ce2d8f2c3d4e5f601",
          itemId: "664f0f3ce2d8f2c3d4e5f777",
          quantityDelta: -2,
        },
        "664f0f3ce2d8f2c3d4e5f999",
      ),
    ).rejects.toThrow(BadRequestException);
  });
});