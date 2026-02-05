import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { SampleCollectionService } from './sample-collection.service';
import { CreateSampleCollectionDto } from './dto/create-sample-collection.dto';
import { UpdateSampleCollectionDto } from './dto/update-sample-collection.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { UpdateSampleCollectionStatusDto } from './dto/update-status.dto';

@ApiTags('sample-collections')
@Controller('sample-collections')
export class SampleCollectionController {
  constructor(private readonly sampleCollectionService: SampleCollectionService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lệnh nhận mẫu mới' })
  @ApiResponse({ status: 201, description: 'Lệnh nhận mẫu đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateSampleCollectionDto) {
    return this.sampleCollectionService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lệnh nhận mẫu' })
  @ApiQuery({ name: 'status', description: 'Lọc theo trạng thái', required: false, enum: ['CHO_DIEU_PHOI', 'CHO_NHAN_LENH', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY'] })
  @ApiResponse({ status: 200, description: 'Danh sách lệnh nhận mẫu' })
  findAll(@Query('status') status?: string) {
    const filter = status ? { trangThai: status } : {};
    return this.sampleCollectionService.findAll(filter);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Xuất danh sách lệnh nhận mẫu ra Excel' })
  @ApiResponse({ status: 200, description: 'File Excel' })
  async exportExcel() {
    return this.sampleCollectionService.exportToExcel();
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Thống kê lệnh nhận mẫu' })
  getStatsSummary() {
    return this.sampleCollectionService.getStatsSummary();
  }

  @Get('staff/:staffId')
  @ApiOperation({ summary: 'Lấy danh sách lệnh nhận mẫu theo nhân viên' })
  @ApiParam({ name: 'staffId', description: 'ID nhân viên' })
  @ApiResponse({ status: 200, description: 'Danh sách lệnh nhận mẫu của nhân viên' })
  findByStaff(@Param('staffId') staffId: string) {
    return this.sampleCollectionService.findByStaff(staffId);
  }

  @Get('clinic/:clinicId')
  @ApiOperation({ summary: 'Lấy danh sách lệnh nhận mẫu theo phòng khám' })
  @ApiParam({ name: 'clinicId', description: 'ID phòng khám' })
  @ApiResponse({ status: 200, description: 'Danh sách lệnh nhận mẫu của phòng khám' })
  findByClinic(@Param('clinicId') clinicId: string) {
    return this.sampleCollectionService.findByClinic(clinicId);
  }

  @Get('code/:maLenh')
  @ApiOperation({ summary: 'Tìm lệnh nhận mẫu theo mã' })
  @ApiParam({ name: 'maLenh', description: 'Mã lệnh', example: 'ML001' })
  @ApiResponse({ status: 200, description: 'Thông tin lệnh nhận mẫu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  findByCode(@Param('maLenh') maLenh: string) {
    return this.sampleCollectionService.findByCode(maLenh);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin lệnh nhận mẫu theo ID' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Thông tin lệnh nhận mẫu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  findOne(@Param('id') id: string) {
    return this.sampleCollectionService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Lệnh nhận mẫu đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  update(@Param('id') id: string, @Body() data: UpdateSampleCollectionDto) {
    return this.sampleCollectionService.update(id, data);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Phân công nhân viên thực hiện' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Đã phân công thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  assignStaff(@Param('id') id: string, @Body() data: AssignStaffDto) {
    return this.sampleCollectionService.assignStaff(id, data.nhanVienThucHien);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateSampleCollectionStatusDto
  ) {
    const { trangThai, ...additionalData } = data;
    return this.sampleCollectionService.updateStatus(id, trangThai, additionalData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Lệnh nhận mẫu đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  delete(@Param('id') id: string) {
    return this.sampleCollectionService.delete(id);
  }

  @Post(':id/upload-images')
  @ApiOperation({ summary: 'Upload hình ảnh hoàn thành' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Upload thành công' })
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/sample-collections',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Chỉ chấp nhận file ảnh!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<any>,
  ) {
    const imagePaths = files.map(file => `/uploads/sample-collections/${file.filename}`);
    return this.sampleCollectionService.update(id, {
      anhHoanThanh: imagePaths,
    });
  }
}
