import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiResponse({ status: 201, description: 'Vai trò đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() data: CreateRoleDto) {
    return this.roleService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả vai trò' })
  @ApiResponse({ status: 200, description: 'Danh sách vai trò' })
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin vai trò theo ID' })
  @ApiParam({ name: 'id', description: 'ID vai trò' })
  @ApiResponse({ status: 200, description: 'Thông tin vai trò' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin vai trò' })
  @ApiParam({ name: 'id', description: 'ID vai trò' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  update(@Param('id') id: string, @Body() data: UpdateRoleDto) {
    return this.roleService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiParam({ name: 'id', description: 'ID vai trò' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}
