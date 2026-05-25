import { IsEnum } from 'class-validator';
import { EntityStatus } from '../../common/enums/status.enum';

export class SetLabAdminStatusDto {
  @IsEnum(EntityStatus)
  status: EntityStatus;
}
