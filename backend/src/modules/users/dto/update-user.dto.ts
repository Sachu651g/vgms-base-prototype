import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const ROLES = [
  'super_admin', 'branch_admin', 'principal', 'hod', 'faculty',
  'warden', 'security_head', 'watchman', 'receptionist', 'student',
] as const;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ example: 'newemail@vgms.com' })
  @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional({ enum: ROLES, example: 'hod' })
  @IsOptional() @IsEnum(ROLES) role?: typeof ROLES[number];

  @ApiPropertyOptional({ example: '9000000099' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ example: false, description: 'Set to false to deactivate the user' })
  @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ example: 'uuid-of-branch' })
  @IsOptional() @IsString() branchId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-department' })
  @IsOptional() @IsString() departmentId?: string;
}
