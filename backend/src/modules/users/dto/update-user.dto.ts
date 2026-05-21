import {
  IsEmail, IsEnum, IsOptional,
  IsString, IsBoolean,
} from 'class-validator';

const ROLES = [
  'super_admin', 'branch_admin', 'principal', 'hod', 'faculty',
  'warden', 'security_head', 'watchman', 'receptionist', 'student',
] as const;

export class UpdateUserDto {
  @IsOptional() @IsString()    name?: string;
  @IsOptional() @IsEmail()     email?: string;
  @IsOptional() @IsEnum(ROLES) role?: typeof ROLES[number];
  @IsOptional() @IsString()    phone?: string;
  @IsOptional() @IsBoolean()   isActive?: boolean;
  @IsOptional() @IsString()    branchId?: string;
  @IsOptional() @IsString()    departmentId?: string;
}
