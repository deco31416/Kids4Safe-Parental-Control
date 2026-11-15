export function formatTimestamp(date?: Date | string): string {
  if (!date) return 'N/A';
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${value.toISOString().replace('T', ' ').substring(0, 19)} UTC`;
}

export function calculateDuration(startTime: Date, endTime?: Date): string {
  if (!endTime) return 'En curso';
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatEventDetails(details: unknown): string {
  if (!details) return 'N/A';
  return typeof details === 'string'
    ? details
    : JSON.stringify(details, null, 2);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calculateSpatialExtent(locations: any[]): string {
  if (locations.length === 0) return 'N/A';
  const latitudes = locations
    .map((item) => item.location?.coordinates?.[1])
    .filter((value) => Number.isFinite(value));
  const longitudes = locations
    .map((item) => item.location?.coordinates?.[0])
    .filter((value) => Number.isFinite(value));

  if (latitudes.length === 0 || longitudes.length === 0) return 'N/A';
  const minLat = Math.min(...latitudes).toFixed(6);
  const maxLat = Math.max(...latitudes).toFixed(6);
  const minLng = Math.min(...longitudes).toFixed(6);
  const maxLng = Math.max(...longitudes).toFixed(6);
  return `${minLat},${minLng} to ${maxLat},${maxLng}`;
}
