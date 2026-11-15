import { BadRequestException } from '@nestjs/common';

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([mime, extension]) => [extension, mime]),
);

export function extensionFor(contentType: string): string {
  const extension = EXTENSIONS[contentType.toLowerCase()];
  if (!extension) throw new BadRequestException('Tipo de archivo no permitido');
  return extension;
}

export function contentTypeFor(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

export function decodeDataUrl(value: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
  if (!match) throw new BadRequestException('Data URL inválida');
  const contentType = match[1].toLowerCase();
  extensionFor(contentType);
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new BadRequestException('Archivo vacío');
  return { buffer, contentType };
}
