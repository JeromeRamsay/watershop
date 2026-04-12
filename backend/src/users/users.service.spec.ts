import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { RealtimeService } from "../realtime/realtime.service";
import { CreateManagedUserDto, UpdateManagedUserDto } from "./dto/manage-user.dto";
import { User } from "./entities/user.entity";
import { UsersService } from "./users.service";

// ─── Mock bcrypt ──────────────────────────────────────────────────────────────
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));
const mockBcryptCompare = bcrypt.compare as jest.Mock;

// ─── Mock user data ───────────────────────────────────────────────────────────
const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: "user-id-1",
  firstName: "John",
  lastName: "Doe",
  username: "johndoe",
  password: "hashed-password",
  role: "staff",
  isActive: true,
  loginCount: 0,
  lastLoginAt: null as Date | null,
  save: jest.fn().mockResolvedValue(undefined),
  select: jest.fn(),
  ...overrides,
});

// ─── Chainable query mock ─────────────────────────────────────────────────────
const makeChainable = (resolvedValue: unknown) => {
  const chain: any = {
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.exec.mockResolvedValue(resolvedValue);
  return chain;
};

// ─── Model factory ────────────────────────────────────────────────────────────
function buildMockModel() {
  // Simulate `new this.userModel(dto)` — jest.fn() used as constructor
  const MockModel: any = jest.fn().mockImplementation(function (dto: any) {
    Object.assign(this, dto);
    this.save = jest.fn().mockResolvedValue({ ...dto, _id: "new-user-id" });
  });

  // Static methods
  MockModel.findOne = jest.fn();
  MockModel.find = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();

  return MockModel;
}

// ─── Test setup ───────────────────────────────────────────────────────────────
describe("UsersService", () => {
  let service: UsersService;
  let mockUserModel: ReturnType<typeof buildMockModel>;
  const mockJwtService = { sign: jest.fn().mockReturnValue("mock-token") };
  const mockRealtimeService = {
    emitDashboardUpdate: jest.fn(),
  };

  beforeEach(async () => {
    mockUserModel = buildMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
    // Restore default mock implementations cleared by clearAllMocks
    mockJwtService.sign.mockReturnValue("mock-token");
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("creates a new user and returns success message", async () => {
      mockUserModel.findOne.mockResolvedValue(null); // no existing user

      const result = await service.register({
        firstName: "Jane",
        lastName: "Smith",
        username: "janesmith",
        password: "password123",
      });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: "janesmith" });
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.registered");
      expect(result).toEqual({ message: "User registered successfully" });
    });

    it("throws BadRequestException when username is already taken", async () => {
      mockUserModel.findOne.mockResolvedValue(makeUser());

      await expect(
        service.register({
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          password: "password123",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserModel).not.toHaveBeenCalledWith(expect.objectContaining({ username: "johndoe" }));
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("returns access_token and user info on successful login", async () => {
      const user = makeUser();
      mockUserModel.findOne.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.login({ username: "johndoe", password: "password123" });

      expect(result.access_token).toBe("mock-token");
      expect(result.user).toMatchObject({
        name: "John Doe",
        role: "staff",
      });
      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.loginCount).toBe(1);
      expect(user.save).toHaveBeenCalled();
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.logged_in");
    });

    it("increments loginCount on each login", async () => {
      const user = makeUser({ loginCount: 4 });
      mockUserModel.findOne.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true);

      await service.login({ username: "johndoe", password: "password123" });

      expect(user.loginCount).toBe(5);
    });

    it("throws UnauthorizedException when user is not found", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.login({ username: "unknown", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when account is deactivated", async () => {
      mockUserModel.findOne.mockResolvedValue(makeUser({ isActive: false }));
      mockBcryptCompare.mockResolvedValue(true);

      await expect(
        service.login({ username: "johndoe", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when account is archived", async () => {
      mockUserModel.findOne.mockResolvedValue(
        makeUser({ archivedAt: new Date("2026-04-11T12:00:00.000Z") }),
      );
      mockBcryptCompare.mockResolvedValue(true);

      await expect(
        service.login({ username: "johndoe", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password does not match", async () => {
      mockUserModel.findOne.mockResolvedValue(makeUser());
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        service.login({ username: "johndoe", password: "wrongpassword" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe("findAll()", () => {
    it("returns all users without passwords", async () => {
      const users = [makeUser(), makeUser({ username: "jane" })];
      mockUserModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue(users) });

      const result = await service.findAll();

      expect(mockUserModel.find).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  // ─── findStaff ─────────────────────────────────────────────────────────────

  describe("findStaff()", () => {
    it("finds staff with all statuses by default (includeInactive=true)", async () => {
      const chain = makeChainable([makeUser()]);
      mockUserModel.find.mockReturnValue(chain);

      await service.findStaff(true);

      expect(mockUserModel.find).toHaveBeenCalledWith({ role: expect.anything(), archivedAt: null });
      // isActive filter should NOT be added
      const query = mockUserModel.find.mock.calls[0][0];
      expect(query.isActive).toBeUndefined();
    });

    it("adds isActive filter when includeInactive=false", async () => {
      const chain = makeChainable([makeUser()]);
      mockUserModel.find.mockReturnValue(chain);

      await service.findStaff(false);

      const query = mockUserModel.find.mock.calls[0][0];
      expect(query.isActive).toBe(true);
      expect(query.archivedAt).toBeNull();
    });
  });

  // ─── createManagedUser ─────────────────────────────────────────────────────

  describe("createManagedUser()", () => {
    const createDto: CreateManagedUserDto = {
      firstName: "Alice",
      lastName: "Wonder",
      username: "alice",
      password: "mypassword",
      role: "staff",
    };

    it("creates and returns the new user", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const savedUser = { ...createDto, _id: "new-id" };
      const chain = makeChainable(savedUser);
      mockUserModel.findById = jest.fn().mockReturnValue(chain);

      const result = await service.createManagedUser(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", 10);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.created");
      expect(result.message).toBe("User created successfully");
    });

    it("throws BadRequestException when username already exists", async () => {
      mockUserModel.findOne.mockResolvedValue(makeUser({ username: "alice" }));

      await expect(service.createManagedUser(createDto)).rejects.toThrow(BadRequestException);
    });

    it("defaults role to staff when not specified", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const chain = makeChainable({ _id: "new-id" });
      mockUserModel.findById = jest.fn().mockReturnValue(chain);

      const dto: CreateManagedUserDto = { ...createDto };
      delete (dto as any).role;

      await service.createManagedUser(dto);

      // The model should have been constructed with role: 'staff'
      const constructedWith = mockUserModel.mock.calls[0][0];
      expect(constructedWith.role).toBe("staff");
    });
  });

  // ─── updateManagedUser ─────────────────────────────────────────────────────

  describe("updateManagedUser()", () => {
    const updateDto: UpdateManagedUserDto = { firstName: "Updated" };

    it("updates and returns the user", async () => {
      const updatedUser = makeUser({ firstName: "Updated" });
      mockUserModel.findOne.mockResolvedValue(null); // no username conflict
      // Service calls: findByIdAndUpdate(...).select("-password")
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.updateManagedUser("user-id-1", updateDto);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-id-1",
        expect.objectContaining({ firstName: "Updated" }),
        { new: true },
      );
      expect(result).toEqual(updatedUser);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.updated");
    });

    it("hashes the new password when password is provided", async () => {
      const chain = makeChainable(makeUser());
      mockUserModel.findByIdAndUpdate.mockReturnValue(chain);

      await service.updateManagedUser("user-id-1", { password: "newpassword" });

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 10);
      const updatePayload = mockUserModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updatePayload.password).toBe("hashed-password");
    });

    it("throws BadRequestException when new username is already taken by another user", async () => {
      mockUserModel.findOne.mockResolvedValue(makeUser({ _id: "other-user-id" }));

      await expect(
        service.updateManagedUser("user-id-1", { username: "taken" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when user does not exist", async () => {
      // Service calls findByIdAndUpdate().select() — null → NotFoundException
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateManagedUser("nonexistent-id", updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── setActiveStatus ───────────────────────────────────────────────────────

  describe("setActiveStatus()", () => {
    it("deactivates a user (false)", async () => {
      const updatedUser = makeUser({ isActive: false });
      // Service calls: findByIdAndUpdate(...).select("-password")
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.setActiveStatus("user-id-1", false);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-id-1",
        { isActive: false },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.status_changed");
    });

    it("activates a user (true)", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(makeUser({ isActive: true })),
      });

      await service.setActiveStatus("user-id-1", true);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-id-1",
        { isActive: true },
        { new: true },
      );
    });

    it("throws NotFoundException when user does not exist", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.setActiveStatus("ghost-id", true)).rejects.toThrow(NotFoundException);
    });
  });

  describe("archiveManagedUser()", () => {
    it("archives a staff user and emits realtime updates", async () => {
      const updatedUser = makeUser({ isActive: false, archivedAt: new Date("2026-04-11T12:00:00.000Z") });
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.archiveManagedUser("user-id-1");

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-id-1",
        expect.objectContaining({ isActive: false, archivedAt: expect.any(Date) }),
        { new: true },
      );
      expect(result).toEqual(updatedUser);
      expect(mockRealtimeService.emitDashboardUpdate).toHaveBeenCalledWith("users.archived");
    });

    it("throws when the user does not exist", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.archiveManagedUser("missing-user")).rejects.toThrow(NotFoundException);
    });

    it("throws when trying to archive a non-staff account", async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(makeUser({ role: "admin", isActive: false, archivedAt: new Date() })),
      });

      await expect(service.archiveManagedUser("admin-user")).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getLoginActivity ──────────────────────────────────────────────────────

  describe("getLoginActivity()", () => {
    const buildChain = (val: unknown) => {
      const chain: any = {
        select: jest.fn(),
        sort: jest.fn(),
        limit: jest.fn(),
      };
      chain.select.mockReturnValue(chain);
      chain.sort.mockReturnValue(chain);
      chain.limit.mockReturnValue(Promise.resolve(val));
      return chain;
    };

    it("uses default limit of 50", async () => {
      const chain = buildChain([]);
      mockUserModel.find.mockReturnValue(chain);

      await service.getLoginActivity();

      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it("uses provided limit", async () => {
      const chain = buildChain([]);
      mockUserModel.find.mockReturnValue(chain);

      await service.getLoginActivity(30);

      expect(chain.limit).toHaveBeenCalledWith(30);
    });

    it("clamps limit to a minimum of 1", async () => {
      const chain = buildChain([]);
      mockUserModel.find.mockReturnValue(chain);

      await service.getLoginActivity(-10);

      expect(chain.limit).toHaveBeenCalledWith(1);
    });

    it("clamps limit to a maximum of 200", async () => {
      const chain = buildChain([]);
      mockUserModel.find.mockReturnValue(chain);

      await service.getLoginActivity(9999);

      expect(chain.limit).toHaveBeenCalledWith(200);
    });

    it("falls back to default when limit is NaN", async () => {
      const chain = buildChain([]);
      mockUserModel.find.mockReturnValue(chain);

      await service.getLoginActivity(NaN);

      expect(chain.limit).toHaveBeenCalledWith(50);
    });
  });
});

