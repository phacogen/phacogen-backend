import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { WorkContentService } from './work-content.service';

@Controller('work-contents')
export class WorkContentController {
  constructor(private readonly workContentService: WorkContentService) {}

  @Post()
  create(@Body() data: any) {
    return this.workContentService.create(data);
  }

  @Get()
  findAll() {
    return this.workContentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workContentService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.workContentService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.workContentService.delete(id);
  }
}
