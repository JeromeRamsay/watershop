import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateEmployeeHourDto } from "./dto/create-employee-hour.dto";
import { EmployeeHour, EmployeeHourDocument } from "./entities/employee-hour.entity";
import { RealtimeService } from "../realtime/realtime.service";

@Injectable()
export class EmployeeHoursService {
  constructor(
    @InjectModel(EmployeeHour.name)
    private employeeHourModel: Model<EmployeeHourDocument>,
    private realtimeService: RealtimeService,
  ) {}

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  async create(createDto: CreateEmployeeHourDto) {
    const workDate = new Date(createDto.workDate);
    if (Number.isNaN(workDate.getTime())) {
      throw new BadRequestException("Invalid work date");
    }

    let hours = createDto.hours;

    if (createDto.startTime && createDto.endTime) {
      const startMins = this.timeToMinutes(createDto.startTime);
      let endMins = this.timeToMinutes(createDto.endTime);
      // Handle overnight shifts (end time before start time)
      if (endMins <= startMins) endMins += 24 * 60;
      hours = Math.round(((endMins - startMins) / 60) * 100) / 100;
    }

    if (hours === undefined || hours === null) {
      throw new BadRequestException("Provide either hours or startTime + endTime");
    }

    const entry = new this.employeeHourModel({
      user: new Types.ObjectId(createDto.userId),
      workDate,
      hours,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
      notes: createDto.notes || "",
      createdBy: createDto.createdBy
        ? new Types.ObjectId(createDto.createdBy)
        : undefined,
    });

    await entry.save();
    this.realtimeService.emitDashboardUpdate("employee_hours.created");
    return entry.populate("user", "firstName lastName username role isActive");
  }

  async findAll(filters: { userId?: string; from?: string; to?: string }) {
    const query: Record<string, unknown> = {};

    if (filters.userId) {
      query.user = new Types.ObjectId(filters.userId);
    }

    if (filters.from || filters.to) {
      const dateQuery: Record<string, Date> = {};
      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestException("Invalid from date");
        }
        dateQuery.$gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestException("Invalid to date");
        }
        dateQuery.$lte = to;
      }
      query.workDate = dateQuery;
    }

    return this.employeeHourModel
      .find(query)
      .populate("user", "firstName lastName username role isActive")
      .sort({ workDate: -1, createdAt: -1 });
  }

  async getSummary(filters: { userId?: string; from?: string; to?: string }) {
    const match: Record<string, unknown> = {};

    if (filters.userId) {
      match.user = new Types.ObjectId(filters.userId);
    }

    if (filters.from || filters.to) {
      const dateQuery: Record<string, Date> = {};
      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestException("Invalid from date");
        }
        dateQuery.$gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestException("Invalid to date");
        }
        dateQuery.$lte = to;
      }
      match.workDate = dateQuery;
    }

    return this.employeeHourModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$user",
          totalHours: { $sum: "$hours" },
          entries: { $sum: 1 },
          daysWorked: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$workDate" } } },
        },
      },
      {
        $project: {
          totalHours: 1,
          entries: 1,
          daysWorked: { $size: "$daysWorked" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          username: "$user.username",
          totalHours: 1,
          entries: 1,
          daysWorked: 1,
        },
      },
      { $sort: { totalHours: -1 } },
    ]);
  }

  async getMonthlySummary(year?: number, userId?: string) {
    const now = new Date();
    const targetYear = year || now.getFullYear();

    const match: Record<string, unknown> = {
      workDate: {
        $gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${targetYear}-12-31T23:59:59.999Z`),
      },
    };

    if (userId) {
      match.user = new Types.ObjectId(userId);
    }

    return this.employeeHourModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$workDate" },
          totalHours: { $sum: "$hours" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalHours: 1,
        },
      },
    ]);
  }
}
