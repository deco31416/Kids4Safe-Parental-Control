import type { JwtSignOptions } from '@nestjs/jwt';

export function getJwtExpiration(value?: string): JwtSignOptions['expiresIn'] {
  return (value?.trim() || '7d') as JwtSignOptions['expiresIn'];
}
