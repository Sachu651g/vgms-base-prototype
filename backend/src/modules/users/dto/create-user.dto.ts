import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type UserRole =
  | 'super_admin' | 'branch_admin' | 'principal' | 'hod'
  | 'faculty' | 'warden' | 'security_head' | 'watchman'
  | 'receptionist' | 'student';

const ROLES: UserRole[] = [
  'super_admin', 'branch_admin', 'principal', 'hod',
  'faculty', 'warden', 'security_head', 'watchman',
  'receptionist', 'student',
];

export class CreateUserDto {
  @ApiProperty({ example: 'Student Ravi', description: 'Full name of the user' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ravi@vgms.com', description: 'Unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Vgms@1234', description: 'Minimum 8 characters. Stored as bcrypt hash.' })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ enum: ROLES, example: 'student', description: 'User role — determines dashboard and permissions' })
  @IsEnum(ROLES)
  role: UserRole;

  @ApiPropertyOptional({ example: '9876543210', description: 'Mobile number' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'uuid-of-branch', description: 'Branch UUID to assign the user to' })
  @IsOptional() @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-department', description: 'Department UUID' })
  @IsOptional() @IsString()
  departmentId?: string;
}
