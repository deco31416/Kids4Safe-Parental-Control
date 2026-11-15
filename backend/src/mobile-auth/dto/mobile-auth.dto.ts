import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class MobileRegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsBoolean()
  acceptedTerms: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  termsVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  privacyVersion?: string;

  @IsOptional()
  @IsString()
  @Matches(/^mobile-[a-zA-Z0-9-]{8,80}$/)
  mobileUnitId?: string;
}

export class MobileLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^mobile-[a-zA-Z0-9-]{8,80}$/)
  mobileUnitId?: string;
}

export class MobileForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class MobileResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(24)
  resetToken: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class MobileAcceptLegalDto {
  @IsBoolean()
  acceptedTerms: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  termsVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  privacyVersion?: string;
}
