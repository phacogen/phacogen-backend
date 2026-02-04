import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RoleService } from './role.service';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() data: any) {
    return this.roleService.create(data);
  }

  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.roleService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}
