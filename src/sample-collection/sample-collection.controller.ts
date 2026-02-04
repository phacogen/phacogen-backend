import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SampleCollectionService } from './sample-collection.service';

@Controller('sample-collections')
export class SampleCollectionController {
  constructor(private readonly sampleCollectionService: SampleCollectionService) {}

  @Post()
  create(@Body() data: any) {
    return this.sampleCollectionService.create(data);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    const filter = status ? { trangThai: status } : {};
    return this.sampleCollectionService.findAll(filter);
  }

  @Get('stats/summary')
  getStatsSummary() {
    return this.sampleCollectionService.getStatsSummary();
  }

  @Get('staff/:staffId')
  findByStaff(@Param('staffId') staffId: string) {
    return this.sampleCollectionService.findByStaff(staffId);
  }

  @Get('clinic/:clinicId')
  findByClinic(@Param('clinicId') clinicId: string) {
    return this.sampleCollectionService.findByClinic(clinicId);
  }

  @Get('code/:maLenh')
  findByCode(@Param('maLenh') maLenh: string) {
    return this.sampleCollectionService.findByCode(maLenh);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sampleCollectionService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.sampleCollectionService.update(id, data);
  }

  @Put(':id/assign')
  assignStaff(@Param('id') id: string, @Body() data: { nhanVienThucHien: string }) {
    return this.sampleCollectionService.assignStaff(id, data.nhanVienThucHien);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() data: { trangThai: string; viTri?: { lat: number; lng: number }; [key: string]: any }
  ) {
    const { trangThai, ...additionalData } = data;
    return this.sampleCollectionService.updateStatus(id, trangThai, additionalData);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.sampleCollectionService.delete(id);
  }
}
