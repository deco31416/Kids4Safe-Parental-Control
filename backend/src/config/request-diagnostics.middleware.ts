import type { NextFunction, Request, Response } from 'express';

const OBSERVED_PATH_PREFIXES = ['/qr', '/auth'];

export function requestDiagnosticsMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (
    process.env.LOG_HTTP_REQUESTS === 'true' &&
    OBSERVED_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))
  ) {
    console.log(`[Request] ${req.method} ${req.path}`, {
      authorization: req.headers.authorization ? 'present' : 'missing',
      apiKey: req.headers['x-api-key'] ? 'present' : 'missing',
      clientIp: req.ip || 'unknown',
    });
  }

  next();
}
