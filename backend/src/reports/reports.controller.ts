import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  DashboardStats,
  ReportFilters,
  RefillOverrideStats,
  ReportsService,
  WalkInStats,
} from "./reports.service";

@ApiTags("Reports & Analytics")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getFilters(year?: string, from?: string, to?: string): ReportFilters {
    const parsedYear = year ? Number.parseInt(year, 10) : undefined;

    return {
      year: Number.isFinite(parsedYear) ? parsedYear : undefined,
      from,
      to,
    };
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Get total revenue and order counts" })
  getDashboardStats(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<DashboardStats> {
    return this.reportsService.getDashboardStats(
      this.getFilters(year, from, to),
    );
  }

  @Get("top-items")
  @ApiOperation({ summary: "Get top 5 most sold items" })
  getTopSellingItems(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.getTopSellingItems(
      this.getFilters(year, from, to),
    );
  }

  @Get("top-customers")
  @ApiOperation({ summary: "Get top 5 customers by spending" })
  getTopCustomers(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.getTopCustomers(this.getFilters(year, from, to));
  }

  @Get("frequent-customers")
  @ApiOperation({ summary: "Get top 5 customers by visit frequency" })
  getFrequentCustomers(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.getFrequentCustomers(
      this.getFilters(year, from, to),
    );
  }

  @Get("walk-in-stats")
  @ApiOperation({ summary: "Get walk-in order metrics and monthly trend" })
  getWalkInStats(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<WalkInStats> {
    return this.reportsService.getWalkInStats(this.getFilters(year, from, to));
  }

  @Get("refill-override-stats")
  @ApiOperation({ summary: "Get refill override metrics by user, by customer, and by user/customer pair" })
  getRefillOverrideStats(
    @Query("year") year?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<RefillOverrideStats> {
    return this.reportsService.getRefillOverrideStats(
      this.getFilters(year, from, to),
    );
  }
}
