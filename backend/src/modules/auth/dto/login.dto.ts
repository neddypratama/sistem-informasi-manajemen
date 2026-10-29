import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Username atau email wajib diisi' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'Password wajib diisi' })
  @IsString()
  @MinLength(4, { message: 'Password minimal 4 karakter' })
  password: string;
}
