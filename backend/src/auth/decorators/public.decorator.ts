import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para marcar rutas como públicas (sin autenticación)
 * 
 * @usage
 * ```typescript
 * @Public()
 * @Get('public-endpoint')
 * publicMethod() { ... }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
