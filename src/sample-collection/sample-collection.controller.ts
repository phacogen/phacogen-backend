import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFiles, UseInterceptors, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { CreateSampleCollectionDto } from './dto/create-sample-collection.dto';
import { UpdateSampleCollectionDto } from './dto/update-sample-collection.dto';
import { UpdateSampleCollectionStatusDto } from './dto/update-status.dto';
import { SampleCollectionService } from './sample-collection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../role/schemas/role.schema';

@ApiTags('sample-collections')
@ApiBearerAuth()
@Controller('sample-collections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SampleCollectionController {
  constructor(private readonly sampleCollectionService: SampleCollectionService) { }

  @Post()
  @Permissions(Permission.ORDER_CREATE)
  @ApiOperation({ summary: 'Tạo lệnh nhận mẫu mới' })
  @ApiResponse({ status: 201, description: 'Lệnh nhận mẫu đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateSampleCollectionDto) {
    return this.sampleCollectionService.create(data);
  }

  @Get()
  @Permissions(Permission.ORDER_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách lệnh nhận mẫu với phân trang và tìm kiếm' })
  @ApiQuery({ name: 'status', description: 'Lọc theo trạng thái', required: false, enum: ['CHO_DIEU_PHOI', 'CHO_NHAN_LENH', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_HUY'] })
  @ApiQuery({ name: 'search', description: 'Tìm kiếm theo mã lệnh hoặc nội dung công việc', required: false })
  @ApiQuery({ name: 'page', description: 'Số trang (bắt đầu từ 1)', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Số lượng mỗi trang', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách lệnh nhận mẫu' })
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    
    return this.sampleCollectionService.findAllWithPagination({
      status,
      search,
      page: pageNum,
      limit: limitNum,
    });
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

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Lấy thống kê cho Dashboard với filter' })
  @ApiQuery({ name: 'status', description: 'Lọc theo trạng thái', required: false })
  @ApiQuery({ name: 'employeeId', description: 'Lọc theo nhân viên', required: false })
  @ApiQuery({ name: 'startDate', description: 'Từ ngày (ISO format)', required: false })
  @ApiQuery({ name: 'endDate', description: 'Đến ngày (ISO format)', required: false })
  @ApiResponse({ status: 200, description: 'Thống kê Dashboard' })
  getDashboardStats(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sampleCollectionService.getDashboardStats({
      status,
      employeeId,
      startDate,
      endDate,
    });
  }

  @Get('history/all')
  @ApiOperation({ summary: 'Lấy tất cả lịch sử tiến trình (tất cả lệnh)' })
  @ApiResponse({ status: 200, description: 'Danh sách lịch sử tiến trình' })
  getAllHistory() {
    return this.sampleCollectionService.getAllHistory();
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

  @Get(':id/history')
  @ApiOperation({ summary: 'Lấy lịch sử tiến trình lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Lịch sử tiến trình' })
  getHistory(@Param('id') id: string) {
    return this.sampleCollectionService.getHistory(id);
  }

  @Get(':id')
  @Permissions(Permission.ORDER_DETAIL_VIEW)
  @ApiOperation({ summary: 'Lấy thông tin lệnh nhận mẫu theo ID' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Thông tin lệnh nhận mẫu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  findOne(@Param('id') id: string) {
    return this.sampleCollectionService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.ORDER_UPDATE)
  @ApiOperation({ summary: 'Cập nhật thông tin lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Lệnh nhận mẫu đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  update(@Param('id') id: string, @Body() data: UpdateSampleCollectionDto) {
    return this.sampleCollectionService.update(id, data);
  }

  @Put(':id/assign')
  @Permissions(Permission.ORDER_ASSIGN)
  @ApiOperation({ summary: 'Phân công nhân viên thực hiện' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Đã phân công thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  assignStaff(@Param('id') id: string, @Body() data: AssignStaffDto) {
    return this.sampleCollectionService.assignStaff(id, data.nhanVienThucHien);
  }

  @Put(':id/status')
  @Permissions(Permission.ORDER_UPDATE)
  @ApiOperation({ summary: 'Cập nhật trạng thái lệnh nhận mẫu' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateSampleCollectionStatusDto
  ) {
    const { trangThai, ...additionalData } = data;
    const result = await this.sampleCollectionService.updateStatus(id, trangThai, additionalData);

    // Trả về kết quả kèm thông tin email status nếu có
    const response: any = result.toObject();
    if ((additionalData as any).emailStatus) {
      response.emailStatus = (additionalData as any).emailStatus;
    }

    return response;
  }

  @Post(':id/resend-email')
  @Permissions(Permission.ORDER_UPDATE)
  @ApiOperation({ summary: 'Gửi lại email thông báo' })
  @ApiParam({ name: 'id', description: 'ID lệnh nhận mẫu' })
  @ApiResponse({ status: 200, description: 'Email đã được gửi lại' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lệnh nhận mẫu' })
  async resendEmail(@Param('id') id: string) {
    return this.sampleCollectionService.resendCompletionEmail(id);
  }

  @Delete(':id')
  @Permissions(Permission.ORDER_DELETE)
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

  @Post('auto-create')
  @ApiOperation({ summary: 'Kiểm tra và tự động tạo lệnh thu mẫu theo cấu hình phòng khám' })
  @ApiResponse({ status: 200, description: 'Kết quả tạo lệnh tự động' })
  async autoCreateOrders(@Body() body: { nguoiGiaoLenh: string }) {
    return this.sampleCollectionService.autoCreateOrders(body.nguoiGiaoLenh);
  }
}
