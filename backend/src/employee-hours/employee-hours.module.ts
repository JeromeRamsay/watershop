import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmployeeHoursController } from "./employee-hours.controller";
import { EmployeeHoursService } from "./employee-hours.service";
import { EmployeeHour, EmployeeHourSchema } from "./entities/employee-hour.entity";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([
      { name: EmployeeHour.name, schema: EmployeeHourSchema },
    ]),
  ],
  controllers: [EmployeeHoursController],
  providers: [EmployeeHoursService],
  exports: [EmployeeHoursService],
})
export class EmployeeHoursModule {}
