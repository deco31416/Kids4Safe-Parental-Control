import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { StorageUrlService } from './storage-url.service';

@Injectable()
export class MediaLinksInterceptor implements NestInterceptor {
  constructor(private readonly urls: StorageUrlService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const user = context.switchToHttp().getRequest().user;
    if (!user || !(user.role === 'superadmin' || user.permissions?.some((p: string) => ['view_sessions', 'view_recordings'].includes(p)))) return next.handle();
    return next.handle().pipe(map((data) => this.refresh(data)));
  }

  private refresh(value: any): any {
    if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
    if (Array.isArray(value)) return value.map((item) => this.refresh(item));
    const plain = typeof value.toObject === 'function' ? value.toObject() : value;
    // Preserve ObjectId and other scalar BSON values when converting documents.
    if (plain._bsontype) return plain;
    return Object.fromEntries(Object.entries(plain).map(([key, child]) => [key,
      typeof child === 'string' && /^(url|thumbnailUrl|avatarUri|avatarThumbnailUrl|photoUrl|photoThumbnailUrl|pdfUrl|cloudinaryUrl|secureUrl|storageUrl)$/.test(key)
        ? this.urls.refresh(child) : this.refresh(child),
    ]));
  }
}
