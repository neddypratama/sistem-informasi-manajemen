import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
