import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';

@ApiTags('visitors')
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all visitors',
    description: 'Returns paginated list of all registered visitors.'
  })
  @ApiQuery({ name: 'page',  required: false, type: Number, example: 1,  description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200, description: 'Paginated visitor list returned successfully' })
  findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.visitorsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visitor by ID', description: 'Returns a single visitor record by UUID.' })
  @ApiParam({ name: 'id', type: String, description: 'Visitor UUID' })
  @ApiResponse({ status: 200, description: 'Visitor found and returned' })
  @ApiResponse({ status: 404, description: 'Visitor not found' })
  findOne(@Param('id') id: string) {
    return this.visitorsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new visitor',
    description: 'Creates a new visitor record. Used by Receptionist during walk-in registration.'
  })
  @ApiBody({
    type: CreateVisitorDto,
    examples: {
      walkin: {
        summary: 'Walk-in visitor',
        value: {
          name: 'John Doe',
          phone: '9876543210',
          email: 'john@example.com',
          idType: 'aadhaar',
          idNumber: '1234-5678-9012'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Visitor registered successfully' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  create(@Body() dto: CreateVisitorDto) {
    return this.visitorsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update visitor record', description: 'Partial update on a visitor record.' })
  @ApiParam({ name: 'id', type: String, description: 'Visitor UUID' })
  @ApiResponse({ status: 200, description: 'Visitor updated successfully' })
  @ApiResponse({ status: 404, description: 'Visitor not found' })
  update(@Param('id') id: string, @Body() dto: UpdateVisitorDto) {
    return this.visitorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete visitor record', description: 'Permanently deletes a visitor by UUID.' })
  @ApiParam({ name: 'id', type: String, description: 'Visitor UUID' })
  @ApiResponse({ status: 200, description: 'Visitor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Visitor not found' })
  remove(@Param('id') id: string) {
    return this.visitorsService.remove(id);
  }
}
