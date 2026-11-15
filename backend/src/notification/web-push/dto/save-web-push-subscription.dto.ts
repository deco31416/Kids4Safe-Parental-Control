import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class WebPushSubscriptionKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

class WebPushSubscriptionDto {
  @IsUrl({ require_tld: false })
  endpoint: string;

  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => WebPushSubscriptionKeysDto)
  keys: WebPushSubscriptionKeysDto;
}

export class SaveWebPushSubscriptionDto {
  @IsString()
  sessionId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WebPushSubscriptionDto)
  subscription: WebPushSubscriptionDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
