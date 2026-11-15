import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''];

export class EmergencyContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  relationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class MobileProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(5_600_000)
  avatarDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  avatarUri?: string;

  @IsOptional()
  @IsIn(BLOOD_TYPES)
  bloodType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
