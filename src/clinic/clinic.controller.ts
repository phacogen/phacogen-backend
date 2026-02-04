import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ClinicService } from './clinic.service';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  create(@Body() data: any) {
    return this.clinicService.create(data);
  }

  @Get()
  findAll() {
    return this.clinicService.findAll();
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('maxDistance') maxDistance?: string
  ) {
    return this.clinicService.findNearby(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      maxDistance ? parseFloat(maxDistance) : 10
    );
  }

  @Get('code/:maPhongKham')
  findByCode(@Param('maPhongKham') maPhongKham: string) {
    return this.clinicService.findByCode(maPhongKham);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clinicService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.clinicService.delete(id);
  }
}
