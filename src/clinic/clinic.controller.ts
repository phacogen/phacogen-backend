import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@ApiTags('clinics')
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phòng khám mới' })
  @ApiResponse({ status: 201, description: 'Phòng khám đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateClinicDto) {
    return this.clinicService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả phòng khám' })
  @ApiResponse({ status: 200, description: 'Danh sách phòng khám' })
  findAll() {
    return this.clinicService.findAll();
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Tìm phòng khám gần vị trí hiện tại' })
  @ApiQuery({ name: 'lat', description: 'Latitude', example: '10.762622' })
  @ApiQuery({ name: 'lng', description: 'Longitude', example: '106.660172' })
  @ApiQuery({ name: 'maxDistance', description: 'Khoảng cách tối đa (km)', required: false, example: '10' })
  @ApiResponse({ status: 200, description: 'Danh sách phòng khám gần đó' })
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
  @ApiOperation({ summary: 'Tìm phòng khám theo mã' })
  @ApiParam({ name: 'maPhongKham', description: 'Mã phòng khám', example: 'PK001' })
  @ApiResponse({ status: 200, description: 'Thông tin phòng khám' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng khám' })
  findByCode(@Param('maPhongKham') maPhongKham: string) {
    return this.clinicService.findByCode(maPhongKham);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phòng khám theo ID' })
  @ApiParam({ name: 'id', description: 'ID phòng khám' })
  @ApiResponse({ status: 200, description: 'Thông tin phòng khám' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng khám' })
  findOne(@Param('id') id: string) {
    return this.clinicService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin phòng khám' })
  @ApiParam({ name: 'id', description: 'ID phòng khám' })
  @ApiResponse({ status: 200, description: 'Phòng khám đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng khám' })
  update(@Param('id') id: string, @Body() data: UpdateClinicDto) {
    return this.clinicService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng khám' })
  @ApiParam({ name: 'id', description: 'ID phòng khám' })
  @ApiResponse({ status: 200, description: 'Phòng khám đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng khám' })
  delete(@Param('id') id: string) {
    return this.clinicService.delete(id);
  }
}
