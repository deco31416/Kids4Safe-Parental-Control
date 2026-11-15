/**
 * 📍 DESKTOP LOCATION INDICATOR
 * ==============================
 * 
 * Muestra la ubicación estimada para usuarios DESKTOP/LAPTOP.
 * Transparente sobre la precisión - NO promete GPS.
 * 
 * Estados:
 * - Cargando: "Estimando ubicación..."
 * - Alta confianza: "📍 Ciudad, País (Precisión: Alta)"
 * - Media confianza: "📍 Región, País (Precisión: Media - ±100 km)"
 * - Baja confianza: "📍 País (Precisión: Baja)"
 * - Con flags: Muestra advertencias (VPN detectado, etc.)
 */

import { MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GeoAssessment } from '@/hooks/useNetworkAssessment';

interface DesktopLocationIndicatorProps {
  assessment: GeoAssessment | null;
  isLoading: boolean;
  error: string | null;
}

export function DesktopLocationIndicator({
  assessment,
  isLoading,
  error,
}: DesktopLocationIndicatorProps) {
  // Mientras carga
  if (isLoading) {
    return (
      <Alert className="w-full border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertDescription className="text-sm text-blue-900 ml-2">
          📡 Estimando ubicación mediante señales de red...
        </AlertDescription>
      </Alert>
    );
  }

  // Si hubo error
  if (error) {
    return (
      <Alert className="w-full border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-sm text-yellow-900 ml-2">
          No se pudo estimar ubicación: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Si no hay assessment
  if (!assessment) {
    return null;
  }

  // Construir texto de ubicación
  let locationText = '';
  if (assessment.confidenceLevel === 'high' && assessment.estimatedCity) {
    locationText = `${assessment.estimatedCity}, ${assessment.estimatedCountry}`;
  } else if (assessment.estimatedRegion) {
    locationText = `${assessment.estimatedRegion}, ${assessment.estimatedCountry}`;
  } else {
    locationText = assessment.estimatedCountry;
  }

  // Color según confidence
  const confidenceColor = {
    high: 'green',
    medium: 'yellow',
    low: 'orange',
  }[assessment.confidenceLevel];

  const borderClass = `border-${confidenceColor}-200`;
  const bgClass = `bg-${confidenceColor}-50`;
  const textClass = `text-${confidenceColor}-900`;
  const iconClass = `text-${confidenceColor}-600`;

  // Texto de precisión
  const accuracyText =
    assessment.confidenceLevel === 'high'
      ? 'Alta'
      : assessment.confidenceLevel === 'medium'
      ? `Media (±${assessment.accuracyRadiusKm} km)`
      : `Baja (±${assessment.accuracyRadiusKm} km)`;

  return (
    <div className="w-full space-y-2">
      {/* Ubicación principal */}
      <Alert className={`${borderClass} ${bgClass}`}>
        <MapPin className={`h-4 w-4 ${iconClass}`} />
        <AlertDescription className={`text-sm ${textClass} ml-2`}>
          <div className="flex items-center justify-between">
            <div>
              <strong>Ubicación estimada:</strong> {locationText}
              <br />
              <span className="text-xs opacity-80">
                Precisión: {accuracyText} • Basado en {assessment.signalsUsed.length} señales de red
              </span>
            </div>
            {assessment.method === 'ml-enhanced' && (
              <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full animate-pulse">
                🧠 ML
              </span>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Flags de riesgo */}
      {assessment.flags.length > 0 && (
        <Alert className="w-full border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-xs text-orange-900 ml-2">
            <strong>Advertencias:</strong>
            <ul className="list-disc list-inside mt-1">
              {assessment.flags.map((flag, idx) => (
                <li key={idx}>
                  {getFlagDescription(flag)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Info técnica (collapsible) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-900">
            Detalles técnicos
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(assessment, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Descripción legible de flags
 */
function getFlagDescription(flag: string): string {
  const descriptions: Record<string, string> = {
    vpn_suspected: 'Posible uso de VPN detectado',
    proxy_suspected: 'Posible uso de proxy detectado',
    timezone_mismatch: 'Zona horaria no coincide con IP',
    rtt_inconsistent: 'Latencia inconsistente con ubicación IP',
    trilateration_mismatch: 'Discrepancia entre señales de triangulación',
    high_packet_loss: 'Alta pérdida de paquetes (>30%)',
    high_jitter: 'Alta variabilidad de latencia (>50ms)',
    cgn_suspected: 'ISP usa Carrier-Grade NAT (CGN)',
    impossible_geographic_jump: '🚨 Salto geográfico irreal detectado (>500km en <5min)',
    uniform_latency: 'Latencia uniforme (posible proxy con caching)',
    cdn_caching_suspected: 'Posible CDN/proxy con caching detectado',
    relay_only_connection: 'Conexión solo vía relay (firewall estricto o VPN corporativa)',
  };

  return descriptions[flag] || flag;
}
