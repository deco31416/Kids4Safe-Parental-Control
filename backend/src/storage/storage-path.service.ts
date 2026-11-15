import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class StoragePathService {
  readonly root?: string;
  readonly unavailableReason?: string;

  constructor(config: ConfigService) {
    const railwayRoot = config.get<string>('RAILWAY_VOLUME_MOUNT_PATH');
    const configuredRoot = config.get<string>('MEDIA_STORAGE_ROOT');
    const production = config.get<string>('NODE_ENV') === 'production';

    if (railwayRoot) this.root = path.resolve(railwayRoot, 'backend');
    else if (configuredRoot) this.root = path.resolve(configuredRoot);
    else if (!production) this.root = path.resolve(process.cwd(), '..', 'local-storage', 'backend');
    else this.unavailableReason = 'Railway Volume no está montado en el backend';
  }

  resolve(key: string): string {
    if (!this.root) throw new ServiceUnavailableException(this.unavailableReason);
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('\0') || normalized.split('/').includes('..')) {
      throw new Error('Storage key inválida');
    }
    const absolute = path.resolve(this.root, normalized);
    const prefix = `${this.root}${path.sep}`;
    if (absolute !== this.root && !absolute.startsWith(prefix)) throw new Error('Storage key fuera de la raíz');
    return absolute;
  }
}
