/**
 * 🌍 GEO ASSESSMENT CARD (Admin Panel)
 * =====================================
 * 
 * Muestra el assessment de ubicación de una sesión desktop.
 * Para administradores - incluye métricas técnicas y flags.
 */

'use client';

import { AlertTriangle, Bot as BotIcon, Brain as BrainIcon, Globe as GlobeIcon, MapPin, Ruler as RulerIcon, Signal, Siren as SirenIcon, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GeoAssessment {
  estimatedCountry: string;
  estimatedRegion?: string;
  estimatedCity?: string;
  estimatedLat?: number;
  estimatedLng?: number;
  accuracyRadiusKm: number;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  signalsUsed: string[];
  flags: string[];
  method: 'ip-only' | 'multi-signal' | 'trilateration' | 'ml-enhanced';
  processedAt: string;
}

interface GeoAssessmentCardProps {
  assessment: GeoAssessment;
  className?: string;
}

export function GeoAssessmentCard({ assessment, className = '' }: GeoAssessmentCardProps) {
  const confidenceColor = {
    high: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    low: 'text-red-600 bg-red-100',
  }[assessment.confidenceLevel];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Ubicación Estimada (Desktop)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ubicación y coordinates */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {assessment.estimatedCity && `${assessment.estimatedCity}, `}
            {assessment.estimatedRegion && `${assessment.estimatedRegion}, `}
            {assessment.estimatedCountry}
          </div>
          {assessment.estimatedLat && assessment.estimatedLng && (
            <div className="text-xs text-muted-foreground mt-1">
              Coords: {assessment.estimatedLat.toFixed(4)}, {assessment.estimatedLng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Confidence Score */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Confianza</span>
              <Badge variant="secondary" className={confidenceColor}>
                {assessment.confidenceScore}% - {assessment.confidenceLevel.toUpperCase()}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  assessment.confidenceLevel === 'high'
                    ? 'bg-green-500'
                    : assessment.confidenceLevel === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${assessment.confidenceScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Método y precisión */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {assessment.method === 'ip-only' && <> <MapPin className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> IP Only </>}
            {assessment.method === 'multi-signal' && <> <GlobeIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Multi-Signal </>}
            {assessment.method === 'trilateration' && <> <RulerIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Trilateration </>}
            {assessment.method === 'ml-enhanced' && <> <BotIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> ML Enhanced </>}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ±{assessment.accuracyRadiusKm} km
          </Badge>
          {assessment.method === 'ml-enhanced' && (
            <Badge className="text-xs bg-primary text-foreground animate-pulse">
              <BrainIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> ML Refinado
            </Badge>
          )}
        </div>

        {/* Señales usadas */}
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Signal className="h-3 w-3" />
            Señales ({assessment.signalsUsed.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {assessment.signalsUsed.map((signal, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {signal}
              </Badge>
            ))}
          </div>
        </div>

        {/* Flags de riesgo */}
        {assessment.flags.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs text-orange-600 mb-1">
              <AlertTriangle className="h-3 w-3" />
              Alertas ({assessment.flags.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {assessment.flags.map((flag, idx) => {
                // 🚨 Destacar salto geográfico irreal
                const isCritical = flag === 'impossible_geographic_jump';
                return (
                  <Badge 
                    key={idx} 
                    variant={isCritical ? 'destructive' : 'outline'} 
                    className={isCritical ? 'text-xs bg-red-600 text-primary-foreground animate-pulse' : 'text-xs border-orange-300 text-orange-700'}
                  >
                    {isCritical && <SirenIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" />}
                    {flag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Procesado: {new Date(assessment.processedAt).toLocaleString('es-CO')}
        </div>
      </CardContent>
    </Card>
  );
}
