import { config } from 'dotenv';
import { resolve } from 'path';

export function loadLocalEnvironment(): void {
  config({ path: resolve(process.cwd(), '.env.local'), override: false });
}

export function requireMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI es requerido');
  return uri;
}

export function assertLocalMutation(flag: string, operation: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${operation} está bloqueado en NODE_ENV=production`);
  }
  if (process.env[flag] !== 'true') {
    throw new Error(`Define ${flag}=true para autorizar explícitamente: ${operation}`);
  }
}
