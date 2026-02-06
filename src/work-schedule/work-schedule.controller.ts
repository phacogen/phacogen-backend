import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { WorkScheduleService } from './work-schedule.service';

@ApiTags('work-schedules')
@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Đặt lịch làm việc cho nhân viên' })
  @ApiResponse({ status: 201, description: 'Lịch làm việc đã được đặt' })
  setSchedule(@Body() data: SetScheduleDto) {
    return this.workScheduleService.setSchedule(data);
  }

  @Get('month')
  @ApiOperation({ summary: 'Lấy lịch làm việc theo tháng' })
  @ApiQuery({ name: 'year', description: 'Năm', example: 2024 })
  @ApiQuery({ name: 'month', description: 'Tháng (1-12)', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách lịch làm việc' })
  getSchedulesByMonth(
    @Query('year') year: number,
    @Query('month') month: number
  ) {
    return this.workScheduleService.getSchedulesByMonth(Number(year), Number(month));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy lịch làm việc của nhân viên theo khoảng thời gian' })
  @ApiParam({ name: 'userId', description: 'ID nhân viên' })
  @ApiQuery({ name: 'startDate', description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Danh sách lịch làm việc' })
  getSchedulesByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.workScheduleService.getSchedulesByUser(userId, startDate, endDate);
  }

  @Get(':userId/:date')
  @ApiOperation({ summary: 'Lấy lịch làm việc của nhân viên trong ngày' })
  @ApiParam({ name: 'userId', description: 'ID nhân viên' })
  @ApiParam({ name: 'date', description: 'Ngày (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Lịch làm việc' })
  getSchedule(
    @Param('userId') userId: string,
    @Param('date') date: string
  ) {
    return this.workScheduleService.getSchedule(userId, date);
  }

  @Delete(':userId/:date')
  @ApiOperation({ summary: 'Xóa lịch làm việc' })
  @ApiParam({ name: 'userId', description: 'ID nhân viên' })
  @ApiParam({ name: 'date', description: 'Ngày (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Đã xóa lịch làm việc' })
  deleteSchedule(
    @Param('userId') userId: string,
    @Param('date') date: string
  ) {
    return this.workScheduleService.deleteSchedule(userId, date);
  }
}
