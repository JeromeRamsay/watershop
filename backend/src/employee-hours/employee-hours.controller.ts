import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateEmployeeHourDto } from "./dto/create-employee-hour.dto";
import { EmployeeHoursService } from "./employee-hours.service";

@ApiTags("Employee Hours")
@Controller("employee-hours")
export class EmployeeHoursController {
  constructor(private readonly employeeHoursService: EmployeeHoursService) {}

  @Post()
  @ApiOperation({ summary: "Create employee hour entry" })
  create(@Body() createDto: CreateEmployeeHourDto) {
    return this.employeeHoursService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "List employee hour entries" })
  findAll(
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.employeeHoursService.findAll({ userId, from, to });
  }

  @Get("summary")
  @ApiOperation({ summary: "Get hours summary by employee" })
  getSummary(
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.employeeHoursService.getSummary({ userId, from, to });
  }

  @Get("monthly")
  @ApiOperation({ summary: "Get monthly hours totals" })
  getMonthly(
    @Query("year") year?: string,
    @Query("userId") userId?: string,
  ) {
    return this.employeeHoursService.getMonthlySummary(
      year ? Number(year) : undefined,
      userId,
    );
  }
}
