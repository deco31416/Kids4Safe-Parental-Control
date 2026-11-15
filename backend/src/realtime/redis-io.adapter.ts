import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(redisUrl?: string) {
    if (!redisUrl) {
      this.logger.warn('REDIS_URL no configurado; Socket.IO usara adapter en memoria');
      return;
    }

    const redisKeyPrefix = process.env.REDIS_KEY_PREFIX || '';
    this.pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      keyPrefix: redisKeyPrefix || undefined,
    });
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.ping(), this.subClient.ping()]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient, {
      key: `${redisKeyPrefix}socket.io`,
    });
    this.logger.log('Socket.IO Redis adapter habilitado');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async close() {
    await Promise.allSettled([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
  }
}
