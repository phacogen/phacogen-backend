import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../role/schemas/role.schema';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(Permission.EMPLOYEE_CREATE)
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  @ApiResponse({ status: 201, description: 'Người dùng đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }

  @Get()
  @Permissions(Permission.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('nearest')
  @Permissions(Permission.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Tìm nhân viên gần nhất' })
  @ApiQuery({ name: 'lat', description: 'Latitude', example: '10.762622' })
  @ApiQuery({ name: 'lng', description: 'Longitude', example: '106.660172' })
  @ApiResponse({ status: 200, description: 'Thông tin nhân viên gần nhất' })
  findNearestStaff(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.userService.findNearestStaff({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  }

  @Get(':id')
  @Permissions(Permission.EMPLOYEE_DETAIL_VIEW)
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @Permissions(Permission.EMPLOYEE_UPDATE)
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({ status: 200, description: 'Người dùng đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  update(@Param('id') id: string, @Body() data: UpdateUserDto) {
    return this.userService.update(id, data);
  }

  @Put(':id/location')
  @ApiOperation({ summary: 'Cập nhật vị trí người dùng' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({ status: 200, description: 'Vị trí đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  updateLocation(@Param('id') id: string, @Body() location: UpdateLocationDto) {
    return this.userService.updateLocation(id, location);
  }

  @Delete(':id')
  @Permissions(Permission.EMPLOYEE_DELETE)
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({ status: 200, description: 'Người dùng đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
