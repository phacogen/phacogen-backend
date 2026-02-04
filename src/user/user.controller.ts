import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() data: any) {
    return this.userService.create(data);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('nearest')
  findNearestStaff(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.userService.findNearestStaff({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.userService.update(id, data);
  }

  @Put(':id/location')
  updateLocation(@Param('id') id: string, @Body() location: { lat: number; lng: number }) {
    return this.userService.updateLocation(id, location);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
