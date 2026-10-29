import { IsArray, IsNumber } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  permissionIds: number[];
}
