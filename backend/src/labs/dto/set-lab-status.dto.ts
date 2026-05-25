import { IsEnum } from 'class-validator';
import { EntityStatus } from '../../common/enums/status.enum';

export class SetLabStatusDto {
  @IsEnum(EntityStatus)
  status: EntityStatus;
}
