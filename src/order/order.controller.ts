import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { UpdateOrderStatusDto } from './dto/update-status.dto';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu cấp mới' })
  @ApiResponse({ status: 201, description: 'Phiếu cấp đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateOrderDto) {
    return this.orderService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiếu cấp' })
  @ApiQuery({ name: 'status', description: 'Lọc theo trạng thái', required: false, enum: ['CHO_DIEU_PHOI', 'CHO_NHAN_LENH', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY'] })
  @ApiResponse({ status: 200, description: 'Danh sách phiếu cấp' })
  findAll(@Query('status') status?: string) {
    const filter = status ? { trangThai: status } : {};
    return this.orderService.findAll(filter);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Thống kê phiếu cấp' })
  getStatsSummary() {
    return this.orderService.getStatsSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phiếu cấp theo ID' })
  @ApiParam({ name: 'id', description: 'ID phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Thông tin phiếu cấp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu cấp' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin phiếu cấp' })
  @ApiParam({ name: 'id', description: 'ID phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Phiếu cấp đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu cấp' })
  update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    return this.orderService.update(id, data);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Phân công người thực hiện' })
  @ApiParam({ name: 'id', description: 'ID phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Đã phân công thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu cấp' })
  assignOrder(@Param('id') id: string, @Body() data: AssignOrderDto) {
    return this.orderService.assignOrder(id, data.nguoiThucHien);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái phiếu cấp' })
  @ApiParam({ name: 'id', description: 'ID phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu cấp' })
  updateStatus(@Param('id') id: string, @Body() data: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, data.trangThai, data.toaDo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu cấp' })
  @ApiParam({ name: 'id', description: 'ID phiếu cấp' })
  @ApiResponse({ status: 200, description: 'Phiếu cấp đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu cấp' })
  delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }
}
