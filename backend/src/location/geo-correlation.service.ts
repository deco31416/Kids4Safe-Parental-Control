import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import axios from 'axios';

/**
 * 🌍 GEO CORRELATION SERVICE
 * ===========================
 * 
 * Fusiona múltiples señales para estimar ubicación en DESKTOP/LAPTOP:
 * - IP geolocation (ciudad aproximada)
 * - RTT multi-punto (distancia por latencia)
 * - Timezone correlation (valida IP location)
 * - ASN + latency patterns (detecta VPN/proxy)
 * - 🆕 ML Triangulation (OPCIONAL - refina confidence score)
 * 
 * SALIDA: GeoAssessment con confidence score y flags de riesgo.
 * PRECISIÓN: 50-200 km en mejor caso. NO es GPS.
 */

export interface NetworkMetrics {
  webrtcRttMs: { server: string; rtt: number }[];
  wsRttMs: number;
  httpTtfbMs: number;
  
  // 🆕 Latency Fingerprint (multi-region backend pings)
  latencyFingerprint?: { region: string; minRtt: number; avgRtt: number; jitter: number }[];
  
  jitterMs: number;
  packetLossEstimate: number;
  
  // 🆕 WebRTC Candidate Types (señal de red)
  webrtcCandidateTypes?: string[]; // host, srflx, relay
  
  connectionType?: string;
  downlink?: number;
  rtt?: number;
  timezone: string;
  timezoneOffset: number;
  language: string;
  measuredAt: number;
}

export interface IPLocation {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  lat: number;
  lng: number;
  timezone?: string;
  isp?: string;
  asn?: string;
  source: string;
}

export interface GeoAssessment {
  // Ubicación estimada
  estimatedCountry: string;
  estimatedRegion?: string;
  estimatedCity?: string;
  
  // Coordenadas (con margen de error)
  estimatedLat?: number;
  estimatedLng?: number;
  accuracyRadiusKm: number; // Margen de error
  
  // Confidence
  confidenceScore: number; // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  
  // Señales usadas
  signalsUsed: string[];
  
  // Flags de riesgo
  flags: string[];
  
  // Metadata
  method: 'ip-only' | 'multi-signal' | 'trilateration' | 'ml-enhanced';
  processedAt: Date;
}

@Injectable()
export class GeoCorrelationService {
  private readonly logger = new Logger(GeoCorrelationService.name);
  private readonly mlTriangulationUrl?: string;
  private readonly mlTriangulationTimeout: number;
  private readonly mlTriangulationEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {
    this.mlTriangulationUrl = this.configService.get<string>('ML_TRIANGULATION_URL') || undefined;
    this.mlTriangulationTimeout = this.configService.get<number>('ML_TRIANGULATION_TIMEOUT', 2000);
    this.mlTriangulationEnabled =
      this.configService.get<boolean>('USE_ML_TRIANGULATION', false) &&
      Boolean(this.mlTriangulationUrl);
    
    this.logger.log(
      `GeoCorrelationService initialized (ML ${this.mlTriangulationEnabled ? 'enabled' : 'disabled'})`,
    );
  }

  /**
   * FUNCIÓN PRINCIPAL: Fusiona IP location + network metrics
   */
  async correlate(
    ipLocation: IPLocation,
    networkMetrics?: NetworkMetrics,
    deviceType?: string,
  ): Promise<GeoAssessment> {
    this.logger.log(`🌍 Correlando ubicación - Device: ${deviceType || 'unknown'}`);
    
    // Si no hay network metrics, solo usar IP
    if (!networkMetrics) {
      return this.assessFromIPOnly(ipLocation);
    }
    
    // Desktop/Laptop con network metrics -> multi-signal fusion
    if (deviceType === 'desktop' || deviceType === 'laptop') {
      return this.assessMultiSignal(ipLocation, networkMetrics);
    }
    
    // Mobile/tablet -> IP + timezone básico
    return this.assessFromIPOnly(ipLocation);
  }

  /**
   * Modo 1: Solo IP (fallback básico)
   */
  private assessFromIPOnly(ipLocation: IPLocation): GeoAssessment {
    const flags: string[] = [];
    let confidenceScore = 50; // Base
    
    // Validar datos de IP
    if (ipLocation.city) confidenceScore += 20;
    if (ipLocation.timezone) confidenceScore += 10;
    if (ipLocation.isp) confidenceScore += 10;
    
    // Detectar ISPs conocidos por usar CGN/proxy
    if (this.isCGNProvider(ipLocation.isp)) {
      flags.push('cgn_suspected');
      confidenceScore -= 20;
    }
    
    return {
      estimatedCountry: ipLocation.country || 'Unknown',
      estimatedRegion: ipLocation.region,
      estimatedCity: ipLocation.city,
      estimatedLat: ipLocation.lat,
      estimatedLng: ipLocation.lng,
      accuracyRadiusKm: 100, // IP típicamente da 50-200 km
      confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
      confidenceLevel: confidenceScore > 70 ? 'high' : confidenceScore > 40 ? 'medium' : 'low',
      signalsUsed: ['ip_location'],
      flags,
      method: 'ip-only',
      processedAt: new Date(),
    };
  }

  /**
   * Modo 2: Multi-signal fusion (Desktop con RTT measurements)
   */
  private async assessMultiSignal(
    ipLocation: IPLocation,
    metrics: NetworkMetrics,
  ): Promise<GeoAssessment> {
    const flags: string[] = [];
    let confidenceScore = 50;
    const signalsUsed: string[] = ['ip_location'];
    
    // 1. Validar timezone consistency
    const timezoneMatch = this.validateTimezone(ipLocation, metrics.timezone);
    if (!timezoneMatch.match) {
      flags.push('timezone_mismatch');
      confidenceScore -= 15;
      this.logger.warn(`⚠️ Timezone mismatch: IP=${ipLocation.timezone} vs Browser=${metrics.timezone}`);
    } else {
      confidenceScore += 10;
      signalsUsed.push('timezone_validation');
    }
    
    // 2. Analizar RTT patterns
    const rttAnalysis = this.analyzeRTTPatterns(ipLocation, metrics);
    
    if (rttAnalysis.consistentWithIP) {
      confidenceScore += 15;
      signalsUsed.push('rtt_consistency');
    } else {
      flags.push('rtt_inconsistent');
      confidenceScore -= 10;
      this.logger.warn(`⚠️ RTT inconsistente con IP location`);
    }
    
    if (rttAnalysis.vpnSuspected) {
      flags.push('vpn_suspected');
      confidenceScore -= 20;
    }
    
    if (rttAnalysis.proxySuspected) {
      flags.push('proxy_suspected');
      confidenceScore -= 15;
    }
    
    signalsUsed.push('webrtc_rtt', 'websocket_rtt');
    
    // 🆕 2.5. Analizar latency fingerprint (si está disponible)
    if (metrics.latencyFingerprint && metrics.latencyFingerprint.length > 0) {
      signalsUsed.push('latency_fingerprint');
      
      // Si el fingerprint muestra baja variación entre regiones, sospecha de proxy
      const avgJitter = metrics.latencyFingerprint.reduce((sum, fp) => sum + fp.jitter, 0) / metrics.latencyFingerprint.length;
      if (avgJitter < 2 && !rttAnalysis.proxySuspected) {
        flags.push('uniform_latency'); // Posible proxy con caching agresivo
        confidenceScore -= 5;
      }
      
      // Si todas las regiones tienen RTT similar (±20ms), sospecha de CDN/proxy
      const minRtts = metrics.latencyFingerprint.map(fp => fp.minRtt);
      const minRtt = Math.min(...minRtts);
      const maxRtt = Math.max(...minRtts);
      if (maxRtt - minRtt < 20 && minRtt > 0) {
        if (!flags.includes('proxy_suspected')) {
          flags.push('cdn_caching_suspected');
        }
      }
    }
    
    // 🆕 2.6. Analizar WebRTC candidate types
    if (metrics.webrtcCandidateTypes && metrics.webrtcCandidateTypes.length > 0) {
      signalsUsed.push('webrtc_candidates');
      
      // Si solo hay 'relay', usuario está detrás de firewall estricto
      if (metrics.webrtcCandidateTypes.includes('relay') && !metrics.webrtcCandidateTypes.includes('host')) {
        flags.push('relay_only_connection'); // Firewall corporativo o VPN
        confidenceScore -= 5;
      }
      
      // Si hay 'host', conexión directa (mejor señal)
      if (metrics.webrtcCandidateTypes.includes('host')) {
        confidenceScore += 5;
      }
    }
    
    // 3. Trilateration estimate (si tenemos suficientes RTT válidos)
    const trilaterationResult = this.estimateByTrilateration(metrics.webrtcRttMs);
    
    if (trilaterationResult) {
      signalsUsed.push('trilateration');
      
      // Comparar trilateration con IP location
      const distance = this.haversineDistance(
        ipLocation.lat,
        ipLocation.lng,
        trilaterationResult.lat,
        trilaterationResult.lng,
      );
      
      this.logger.log(`📍 Trilateration distance from IP: ${distance.toFixed(0)} km`);
      
      if (distance < 200) {
        // Coincide razonablemente con IP
        confidenceScore += 20;
        
        // Usar promedio ponderado entre IP y trilateration
        return {
          estimatedCountry: ipLocation.country || 'Unknown',
          estimatedRegion: ipLocation.region,
          estimatedCity: ipLocation.city,
          estimatedLat: (ipLocation.lat + trilaterationResult.lat) / 2,
          estimatedLng: (ipLocation.lng + trilaterationResult.lng) / 2,
          accuracyRadiusKm: Math.max(50, distance / 2),
          confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
          confidenceLevel: confidenceScore > 70 ? 'high' : confidenceScore > 40 ? 'medium' : 'low',
          signalsUsed,
          flags,
          method: 'trilateration',
          processedAt: new Date(),
        };
      } else {
        // Discrepancia grande -> flag y bajar confidence
        flags.push('trilateration_mismatch');
        confidenceScore -= 15;
      }
    }
    
    // 4. Quality indicators
    if (metrics.packetLossEstimate > 0.3) {
      flags.push('high_packet_loss');
      confidenceScore -= 10;
    }
    
    if (metrics.jitterMs > 50) {
      flags.push('high_jitter');
      confidenceScore -= 5;
    }
    
    // Resultado final (sin trilateration coincidente)
    const baseAssessment: GeoAssessment = {
      estimatedCountry: ipLocation.country || 'Unknown',
      estimatedRegion: ipLocation.region,
      estimatedCity: ipLocation.city,
      estimatedLat: ipLocation.lat,
      estimatedLng: ipLocation.lng,
      accuracyRadiusKm: 100,
      confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
      confidenceLevel: confidenceScore > 70 ? 'high' : confidenceScore > 40 ? 'medium' : 'low',
      signalsUsed,
      flags,
      method: 'multi-signal',
      processedAt: new Date(),
    };

    const useML = this.mlTriangulationEnabled && await this.featureFlagsService.getFlag('ml_triangulation');
    if (useML && this.mlTriangulationUrl) {
      return await this.refineWithML(baseAssessment, ipLocation, metrics);
    }

    return baseAssessment;
  }

  /**
   * 🤖 Refina confidence score usando ML Triangulation (PLUGIN OPCIONAL)
   * Nunca bloqueante - si falla, devuelve assessment base
   */
  private async refineWithML(
    baseAssessment: GeoAssessment,
    ipLocation: IPLocation,
    metrics: NetworkMetrics,
  ): Promise<GeoAssessment> {
    try {
      this.logger.log('🤖 Llamando ML Triangulation para refinamiento...');
      
      const response = await axios.post(
        `${this.mlTriangulationUrl}/triangulate`,
        {
          ipLocation: {
            lat: ipLocation.lat,
            lng: ipLocation.lng,
            city: ipLocation.city,
            country: ipLocation.country,
            timezone: ipLocation.timezone,
          },
          latencyFingerprint: metrics.latencyFingerprint || [],
          browserTimezone: metrics.timezone,
          webrtcCandidateTypes: metrics.webrtcCandidateTypes || [],
          currentConfidenceScore: baseAssessment.confidenceScore,
          currentFlags: baseAssessment.flags,
        },
        {
          timeout: this.mlTriangulationTimeout,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.data && response.data.success) {
        const mlResult = response.data;
        
        this.logger.log(
          `✅ ML Refinamiento: ${baseAssessment.confidenceScore}% → ${mlResult.refinedConfidenceScore}% ` +
          `(Δ${mlResult.confidenceDelta > 0 ? '+' : ''}${mlResult.confidenceDelta.toFixed(1)})`
        );

        // Agregar señales ML usadas
        const enrichedSignals = [
          ...baseAssessment.signalsUsed,
          ...mlResult.mlSignalsUsed.map((s: string) => `ml_${s}`),
        ];

        // Actualizar confidence level según nuevo score
        const refinedScore = mlResult.refinedConfidenceScore;
        const newConfidenceLevel = refinedScore > 70 ? 'high' : refinedScore > 40 ? 'medium' : 'low';

        return {
          ...baseAssessment,
          confidenceScore: refinedScore,
          confidenceLevel: newConfidenceLevel,
          signalsUsed: enrichedSignals,
          method: 'ml-enhanced' as any, // Nuevo método
        };
      } else {
        this.logger.warn('⚠️ ML Triangulation no devolvió resultado válido - usando score base');
        return baseAssessment;
      }
    } catch (error: any) {
      // NUNCA BLOQUEANTE - si ML falla, continuar con assessment base
      this.logger.warn(
        `⚠️ ML Triangulation falló (${error.message}) - usando score base sin refinamiento`
      );
      return baseAssessment;
    }
  }

  /**
   * Valida si timezone del browser coincide con IP location
   */
  private validateTimezone(ipLocation: IPLocation, browserTimezone: string): {
    match: boolean;
    reason?: string;
  } {
    if (!ipLocation.timezone) {
      return { match: true, reason: 'no_ip_timezone' };
    }
    
    // Comparación directa
    if (ipLocation.timezone === browserTimezone) {
      return { match: true };
    }
    
    // Algunos países tienen múltiples timezones - validar país
    const ipCountry = this.timezoneToCountry(ipLocation.timezone);
    const browserCountry = this.timezoneToCountry(browserTimezone);
    
    if (ipCountry === browserCountry) {
      return { match: true, reason: 'same_country' };
    }
    
    return { match: false, reason: 'different_timezone' };
  }

  /**
   * Analiza patrones de RTT para detectar anomalías
   */
  private analyzeRTTPatterns(
    ipLocation: IPLocation,
    metrics: NetworkMetrics,
  ): {
    consistentWithIP: boolean;
    vpnSuspected: boolean;
    proxySuspected: boolean;
  } {
    // Calcular RTT esperado basado en distancia a servidor
    // Asumiendo servidor en USA-East (simplificación)
    const serverLat = 40.7128;
    const serverLng = -74.0060;
    
    const distanceKm = this.haversineDistance(
      ipLocation.lat,
      ipLocation.lng,
      serverLat,
      serverLng,
    );
    
    // RTT esperado: distancia / velocidad_luz_fibra
    // Velocidad en fibra: ~200 km/ms (ida y vuelta)
    const expectedRttMin = distanceKm / 200; // ms
    const expectedRttMax = distanceKm / 100; // ms (factor 2x por routing)
    
    const actualRtt = metrics.wsRttMs;
    
    this.logger.log(
      `📊 RTT Analysis: Distance=${distanceKm.toFixed(0)}km, Expected=${expectedRttMin.toFixed(0)}-${expectedRttMax.toFixed(0)}ms, Actual=${actualRtt.toFixed(0)}ms`,
    );
    
    // VPN detection: RTT mucho mayor de lo esperado
    const vpnSuspected = actualRtt > expectedRttMax * 2;
    
    // Proxy detection: RTT consistentemente bajo pero IP location extraña
    const proxySuspected = actualRtt < expectedRttMin * 0.5 && distanceKm > 1000;
    
    // Consistency check
    const consistentWithIP = actualRtt >= expectedRttMin * 0.5 && actualRtt <= expectedRttMax * 2;
    
    return {
      consistentWithIP,
      vpnSuspected,
      proxySuspected,
    };
  }

  /**
   * Trilateration usando RTT a múltiples STUN servers
   * 
   * LIMITACIÓN: Muy simplificado, asume línea recta y velocidad constante.
   * Precisión real: 50-200 km en mejor caso.
   */
  private estimateByTrilateration(
    rttMeasurements: { server: string; rtt: number }[],
  ): { lat: number; lng: number } | null {
    // Filtrar mediciones válidas
    const valid = rttMeasurements.filter(m => m.rtt > 0 && m.rtt < 1000);
    
    if (valid.length < 3) {
      this.logger.warn('⚠️ Insuficientes mediciones RTT para trilateration');
      return null;
    }
    
    // Ubicaciones conocidas de STUN servers (hardcoded - match con frontend)
    const serverLocations: Record<string, { lat: number; lng: number }> = {
      'USA-East': { lat: 37.7749, lng: -122.4194 },
      'USA-West': { lat: 40.7128, lng: -74.0060 },
      'Global-CDN': { lat: 51.5074, lng: -0.1278 },
      'Twilio-Global': { lat: 37.7749, lng: -122.4194 },
    };
    
    // Convertir RTT a distancia (km)
    // RTT ms → distancia km ≈ (RTT / 2) * 200 km/ms
    const circles = valid
      .filter(m => serverLocations[m.server])
      .map(m => ({
        ...serverLocations[m.server],
        radiusKm: (m.rtt / 2) * 200, // Muy aproximado
      }));
    
    if (circles.length < 3) {
      return null;
    }
    
    // Trilateration simplificado: centroid ponderado por inverso del radio
    let sumLat = 0;
    let sumLng = 0;
    let sumWeights = 0;
    
    circles.forEach(circle => {
      const weight = 1 / circle.radiusKm; // Menor distancia = mayor peso
      sumLat += circle.lat * weight;
      sumLng += circle.lng * weight;
      sumWeights += weight;
    });
    
    const estimatedLat = sumLat / sumWeights;
    const estimatedLng = sumLng / sumWeights;
    
    this.logger.log(
      `📍 Trilateration estimate: ${estimatedLat.toFixed(4)}, ${estimatedLng.toFixed(4)}`,
    );
    
    return {
      lat: estimatedLat,
      lng: estimatedLng,
    };
  }

  /**
   * Haversine distance (km) - ahora público para uso externo
   */
  public haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Detecta ISPs conocidos por usar CGN/CGNAT (Carrier-Grade NAT)
   */
  private isCGNProvider(isp?: string): boolean {
    if (!isp) return false;
    
    const cgnKeywords = [
      'mobile',
      'cellular',
      '4g',
      '5g',
      'cgn',
      'cgnat',
      'carrier',
    ];
    
    const ispLower = isp.toLowerCase();
    return cgnKeywords.some(keyword => ispLower.includes(keyword));
  }

  /**
   * Extrae país de timezone IANA
   */
  private timezoneToCountry(timezone: string): string {
    // Simplificación: primer componente del timezone IANA
    // Ej: America/Bogota → America
    //     Europe/Madrid → Europe
    const parts = timezone.split('/');
    return parts[0];
  }
}
