import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { WorkScheduleService } from './work-schedule.service';

@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  setSchedule(@Body() data: { userId: string; date: string; caLamViec: string }) {
    return this.workScheduleService.setSchedule(data.userId, data.date, data.caLamViec);
  }

  @Get('month')
  getSchedulesByMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.workScheduleService.getSchedulesByMonth(parseInt(year), parseInt(month));
  }

  @Get('user/:userId')
  getSchedulesByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workScheduleService.getSchedulesByUser(userId, startDate, endDate);
  }

  @Get(':userId/:date')
  getSchedule(@Param('userId') userId: string, @Param('date') date: string) {
    return this.workScheduleService.getSchedule(userId, date);
  }

  @Delete(':userId/:date')
  deleteSchedule(@Param('userId') userId: string, @Param('date') date: string) {
    return this.workScheduleService.deleteSchedule(userId, date);
  }
}
