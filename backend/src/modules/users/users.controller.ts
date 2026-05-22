import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all users',
    description: 'Returns paginated list of users. Filter by role or search by name/email.'
  })
  @ApiQuery({ name: 'page',   required: false, type: Number, example: 1,        description: 'Page number' })
  @ApiQuery({ name: 'limit',  required: false, type: Number, example: 10,       description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'ravi',   description: 'Search by name or email' })
  @ApiQuery({ name: 'role',   required: false, type: String, example: 'student', description: 'Filter by role' })
  @ApiResponse({ status: 200, description: 'Paginated user list returned successfully' })
  findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role')   role?: string,
  ) {
    return this.usersService.findAll({ page, limit, search, role });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Returns a single user by UUID. Never returns passwordHash.' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'User found and returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a user. Password is bcrypt-hashed with 12 salt rounds before storage. Never stored in plain text.'
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      student: {
        summary: 'Create a student',
        value: { name: 'Student Ravi', email: 'ravi2@vgms.com', password: 'Vgms@1234', role: 'student', phone: '9876543210' }
      },
      hod: {
        summary: 'Create an HOD',
        value: { name: 'Dr. New HOD', email: 'hod2@vgms.com', password: 'Vgms@1234', role: 'hod' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 422, description: 'Validation failed — check request body' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Partial update — only include fields you want to change. All fields are optional.'
  })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      deactivate: {
        summary: 'Deactivate user',
        value: { isActive: false }
      },
      rename: {
        summary: 'Update name and phone',
        value: { name: 'Updated Name', phone: '9000000099' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user', description: 'Permanently deletes a user by UUID.' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
