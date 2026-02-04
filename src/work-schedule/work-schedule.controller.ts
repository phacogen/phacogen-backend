import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';

@ApiTags('work-schedules')
@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Thiết lập lịch làm việc' })
  @ApiResponse({ status: 201, description: 'Lịch làm việc đã được thiết lập' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  setSchedule(@Body() data: CreateWorkScheduleDto) {
    return this.workScheduleService.setSchedule(data.userId, data.date, data.caLamViec);
  }

  @Get('month')
  @ApiOperation({ summary: 'Lấy lịch làm việc theo tháng' })
  @ApiQuery({ name: 'year', description: 'Năm', example: '2024' })
  @ApiQuery({ name: 'month', description: 'Tháng (1-12)', example: '1' })
  @ApiResponse({ status: 200, description: 'Danh sách lịch làm việc trong tháng' })
  getSchedulesByMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.workScheduleService.getSchedulesByMonth(parseInt(year), parseInt(month));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy lịch làm việc theo người dùng và khoảng thời gian' })
  @ApiParam({ name: 'userId', description: 'ID người dùng' })
  @ApiQuery({ name: 'startDate', description: 'Ngày bắt đầu (YYYY-MM-DD)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', description: 'Ngày kết thúc (YYYY-MM-DD)', example: '2024-01-31' })
  @ApiResponse({ status: 200, description: 'Danh sách lịch làm việc của người dùng' })
  getSchedulesByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workScheduleService.getSchedulesByUser(userId, startDate, endDate);
  }

  @Get(':userId/:date')
  @ApiOperation({ summary: 'Lấy lịch làm việc theo người dùng và ngày cụ thể' })
  @ApiParam({ name: 'userId', description: 'ID người dùng' })
  @ApiParam({ name: 'date', description: 'Ngày (YYYY-MM-DD)', example: '2024-01-15' })
  @ApiResponse({ status: 200, description: 'Thông tin lịch làm việc' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch làm việc' })
  getSchedule(@Param('userId') userId: string, @Param('date') date: string) {
    return this.workScheduleService.getSchedule(userId, date);
  }

  @Delete(':userId/:date')
  @ApiOperation({ summary: 'Xóa lịch làm việc' })
  @ApiParam({ name: 'userId', description: 'ID người dùng' })
  @ApiParam({ name: 'date', description: 'Ngày (YYYY-MM-DD)', example: '2024-01-15' })
  @ApiResponse({ status: 200, description: 'Lịch làm việc đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch làm việc' })
  deleteSchedule(@Param('userId') userId: string, @Param('date') date: string) {
    return this.workScheduleService.deleteSchedule(userId, date);
  }
}
