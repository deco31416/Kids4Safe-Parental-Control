import {
  calculateDuration,
  calculateSpatialExtent,
  formatBytes,
  formatEventDetails,
  formatTimestamp,
} from './pdf-report-formatters';

interface ReportSources {
  session: any;
  auditLogs: any[];
  locations: any[];
  qrCodeDataUrl: string;
  generatedAt?: Date;
}

export function buildPdfReportData(sources: ReportSources) {
  const { session, auditLogs, locations, qrCodeDataUrl } = sources;
  const generatedAt = sources.generatedAt ?? new Date();

  return {
    sessionId: session.sessionId || session._id.toString(),
    qrId: session.qrId,
    qrCodeDataUrl,
    status: session.status,
    startTime: formatTimestamp(session.startTime),
    endTime: session.endTime ? formatTimestamp(session.endTime) : 'N/A',
    duration: calculateDuration(session.startTime, session.endTime),
    deviceInfo: {
      userAgent: session.deviceInfo?.userAgent || 'N/A',
      platform: session.deviceInfo?.platform || 'N/A',
      screenResolution: session.deviceInfo?.screenResolution
        ? `${session.deviceInfo.screenResolution.width}x${session.deviceInfo.screenResolution.height}`
        : 'N/A',
    },
    forensicEvents: auditLogs.map((log) => ({
      timestamp: formatTimestamp(log.timestamp),
      eventType: log.eventType,
      details: formatEventDetails(log.eventDetails),
      hash: log.hash || 'N/A',
    })),
    locations: locations.map((location) => ({
      timestamp: formatTimestamp(location.timestamp),
      latitude: location.latitude?.toFixed(6) || 'N/A',
      longitude: location.longitude?.toFixed(6) || 'N/A',
      accuracy: location.accuracy ? `${location.accuracy.toFixed(0)}m` : 'N/A',
      source: location.source || 'unknown',
    })),
    screenshots: mapScreenshots(session.screenshots),
    recordings: (session.recordings ?? []).map((recording) => ({
      url: recording.url,
      timestamp: formatTimestamp(recording.timestamp),
      duration: recording.duration ? `${recording.duration}s` : 'N/A',
      size: recording.size ? formatBytes(recording.size) : 'N/A',
    })),
    iso19115: {
      coordinateSystem: 'WGS84 (EPSG:4326)',
      accuracy: locations.length > 0 ? '±10-50m (GPS) / ±20km (IP)' : 'N/A',
      lineage: 'Kids4Safe v1.0.0-staging - Forensic Session Tracking Platform',
      dateGenerated: formatTimestamp(generatedAt),
      spatialExtent: calculateSpatialExtent(locations),
    },
    chainOfCustody: {
      sessionHash: session.sessionHash || 'N/A',
      algorithm: 'SHA-256',
      timestamp: formatTimestamp(generatedAt),
    },
    generatedAt: formatTimestamp(generatedAt),
    version: 'v1.0.0-staging',
  };
}

function mapScreenshots(screenshots: any[] = []) {
  return screenshots.map((screenshot) => {
    if (typeof screenshot === 'string') {
      return { url: screenshot, timestamp: 'N/A', size: 'N/A' };
    }
    return {
      url: screenshot.url || screenshot,
      timestamp: screenshot.timestamp
        ? formatTimestamp(screenshot.timestamp)
        : 'N/A',
      size: screenshot.size ? formatBytes(screenshot.size) : 'N/A',
    };
  });
}
