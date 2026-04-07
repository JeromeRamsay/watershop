import { Controller, Get, Query } from "@nestjs/common";
import { ReportsService, DashboardStats, WalkInStats } from "./reports.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Reports & Analytics")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get total revenue and order counts" })
  getDashboardStats(@Query("year") year?: string): Promise<DashboardStats> {
    return this.reportsService.getDashboardStats(
      year ? parseInt(year) : undefined,
    );
  }

  @Get("top-items")
  @ApiOperation({ summary: "Get top 5 most sold items" })
  getTopSellingItems(@Query("year") year?: string) {
    return this.reportsService.getTopSellingItems(
      year ? parseInt(year) : undefined,
    );
  }

  @Get("top-customers")
  @ApiOperation({ summary: "Get top 5 customers by spending" })
  getTopCustomers(@Query("year") year?: string) {
    return this.reportsService.getTopCustomers(
      year ? parseInt(year) : undefined,
    );
  }

  @Get("frequent-customers")
  @ApiOperation({ summary: "Get top 5 customers by visit frequency" })
  getFrequentCustomers(@Query("year") year?: string) {
    return this.reportsService.getFrequentCustomers(
      year ? parseInt(year) : undefined,
    );
  }

  @Get("walk-in-stats")
  @ApiOperation({ summary: "Get walk-in order metrics and monthly trend" })
  getWalkInStats(@Query("year") year?: string): Promise<WalkInStats> {
    return this.reportsService.getWalkInStats(
      year ? parseInt(year) : undefined,
    );
  }
}
