import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() data: any) {
    return this.orderService.create(data);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    const filter = status ? { trangThai: status } : {};
    return this.orderService.findAll(filter);
  }

  @Get('stats/summary')
  getStatsSummary() {
    return this.orderService.getStatsSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.orderService.update(id, data);
  }

  @Put(':id/assign')
  assignOrder(@Param('id') id: string, @Body() data: { nguoiThucHien: string }) {
    return this.orderService.assignOrder(id, data.nguoiThucHien);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: { trangThai: string; toaDo?: { lat: number; lng: number } }) {
    return this.orderService.updateStatus(id, data.trangThai, data.toaDo);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }
}
