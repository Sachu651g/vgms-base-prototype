import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsEnum(ROLES, { message: `role must be one of: ${ROLES.join(', ')}` })
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
