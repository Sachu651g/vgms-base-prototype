import { IsNotEmpty, IsOptional, IsString, IsEmail, IsUUID } from 'class-validator';

export class CreateVisitorDto {
  @IsUUID()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
