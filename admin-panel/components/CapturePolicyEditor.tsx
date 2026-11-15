'use client';

import { AlertCircle, Battery, Camera, CheckCircle2 as CheckCircle2Icon, Loader2, MapPin, Mic, Monitor, RefreshCw, Save, Settings, SlidersHorizontal as SlidersHorizontalIcon, XCircle as XCircleIcon, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface CapturePolicyEditorProps {
  qrId: string;
  onSaved?: () => void;
}

interface CapturePolicy {
  intervals?: {
    camera?: number;
    screen?: number;
    microphone?: number;
    gps?: number;
  };
  onlyIfChanged?: boolean;
  changeThresholds?: {
    gpsMeters?: number;
    imageDiffPercent?: number;
    audioLevelDelta?: number;
  };
  perDeviceOverrides?: {
    mobile?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
    tablet?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
    desktop?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
  };
  policyPreset?: 'default' | 'high-frequency' | 'low-power' | 'custom';
}

const PRESETS: Record<string, CapturePolicy> = {
  default: {
    intervals: {
      camera: 15000,
      screen: 15000,
      microphone: 15000,
      gps: 30000,
    },
    onlyIfChanged: true,
    changeThresholds: {
      gpsMeters: 10,
      imageDiffPercent: 5,
      audioLevelDelta: 10,
    },
    policyPreset: 'default',
  },
  'high-frequency': {
    intervals: {
      camera: 5000,
      screen: 5000,
      microphone: 2000,
      gps: 10000,
    },
    onlyIfChanged: false,
    changeThresholds: {
      gpsMeters: 5,
      imageDiffPercent: 2,
      audioLevelDelta: 5,
    },
    policyPreset: 'high-frequency',
  },
  'low-power': {
    intervals: {
      camera: 60000,
      screen: 60000,
      microphone: 30000,
      gps: 120000,
    },
    onlyIfChanged: true,
    changeThresholds: {
      gpsMeters: 50,
      imageDiffPercent: 10,
      audioLevelDelta: 20,
    },
    policyPreset: 'low-power',
  },
};

export default function CapturePolicyEditor({ qrId, onSaved }: CapturePolicyEditorProps) {
  const [policy, setPolicy] = useState<CapturePolicy>(PRESETS.default);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  const { toast } = useToast();

  useEffect(() => {
    loadPolicy();
  }, [qrId]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/qr/${qrId}/capture-policy`);
      if (response.ok) {
        const data = await response.json();
        setPolicy(data.capturePolicy);
        setSelectedPreset(data.capturePolicy.policyPreset || 'custom');
        
        toast({
          title: <> <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Política cargada </>,
          description: `Preset: ${data.capturePolicy.policyPreset || 'custom'}`,
        });
      }
    } catch (error) {
      console.error('Error loading capture policy:', error);
      toast({
        variant: "destructive",
        title: <> <XCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Error </>,
        description: "No se pudo cargar la política",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setPolicy({ ...PRESETS[preset], policyPreset: preset as any });
      toast({
        title: <> <SlidersHorizontalIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Preset aplicado </>,
        description: `Configuración "${preset}" seleccionada`,
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/qr/${qrId}/capture-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(policy),
      });

      if (!response.ok) {
        throw new Error('Failed to save capture policy');
      }

      if (onSaved) onSaved();
      
      toast({
        title: <> <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Guardado exitoso </>,
        description: `Política "${selectedPreset}" aplicada correctamente`,
      });
    } catch (error: any) {
      console.error('Error saving capture policy:', error);
      toast({
        variant: "destructive",
        title: <> <XCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Error al guardar </>,
        description: error.message || "No se pudo guardar la política",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateInterval = (target: 'camera' | 'screen' | 'microphone' | 'gps', value: number) => {
    setPolicy((prev) => ({
      ...prev,
      intervals: {
        ...prev.intervals,
        [target]: value,
      },
      policyPreset: 'custom',
    }));
    setSelectedPreset('custom');
  };

  const updateThreshold = (key: 'gpsMeters' | 'imageDiffPercent' | 'audioLevelDelta', value: number) => {
    setPolicy((prev) => ({
      ...prev,
      changeThresholds: {
        ...prev.changeThresholds,
        [key]: value,
      },
      policyPreset: 'custom',
    }));
    setSelectedPreset('custom');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-4 w-[400px] mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Capture Policy Configuration
        </CardTitle>
        <CardDescription>
          Configura intervalos de captura y umbrales de detección de cambios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Selector */}
        <div className="space-y-2">
          <Label className="inline-flex items-center gap-2"><Settings className="h-4 w-4 text-primary" aria-hidden="true" />Preset de Política</Label>
          <select
            className="w-full border rounded-md p-2"
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            <option value="default">Default (Balanceado)</option>
            <option value="high-frequency">Alta Frecuencia (Intensivo)</option>
            <option value="low-power">Bajo Consumo (Ahorro de batería)</option>
            <option value="custom">Personalizado</option>
          </select>
          {selectedPreset === 'custom' && (
            <Badge variant="outline" className="mt-2">
              Configuración personalizada activa
            </Badge>
          )}
        </div>

        <Separator />

        {/* Only If Changed Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Solo capturar si detecta cambios</Label>
            <p className="text-sm text-muted-foreground">
              Ahorra recursos capturando solo cuando hay movimiento/cambios
            </p>
          </div>
          <Switch
            checked={policy.onlyIfChanged ?? true}
            onCheckedChange={(checked) =>
              setPolicy((prev) => ({ ...prev, onlyIfChanged: checked, policyPreset: 'custom' }))
            }
          />
        </div>

        <Separator />

        {/* Capture Intervals */}
        <div className="space-y-4">
          <h3 className="font-semibold">Intervalos de Captura</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Interval */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Cámara
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={policy.intervals?.camera ?? 15000}
                  onChange={(e) => updateInterval('camera', parseInt(e.target.value))}
                  min={1000}
                  step={1000}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ms</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {((policy.intervals?.camera ?? 15000) / 1000).toFixed(1)}s entre capturas
              </p>
            </div>

            {/* Screen Interval */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Pantalla
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={policy.intervals?.screen ?? 15000}
                  onChange={(e) => updateInterval('screen', parseInt(e.target.value))}
                  min={1000}
                  step={1000}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ms</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {((policy.intervals?.screen ?? 15000) / 1000).toFixed(1)}s entre capturas
              </p>
            </div>

            {/* Microphone Interval */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Micrófono
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={policy.intervals?.microphone ?? 15000}
                  onChange={(e) => updateInterval('microphone', parseInt(e.target.value))}
                  min={1000}
                  step={1000}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ms</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {((policy.intervals?.microphone ?? 15000) / 1000).toFixed(1)}s (chunks de audio)
              </p>
            </div>

            {/* GPS Interval */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={policy.intervals?.gps ?? 30000}
                  onChange={(e) => updateInterval('gps', parseInt(e.target.value))}
                  min={1000}
                  step={1000}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ms</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {((policy.intervals?.gps ?? 30000) / 1000).toFixed(1)}s entre lecturas GPS
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Change Thresholds */}
        <div className="space-y-4">
          <h3 className="font-semibold">Umbrales de Detección de Cambios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GPS Threshold */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS (metros)
              </Label>
              <Input
                type="number"
                value={policy.changeThresholds?.gpsMeters ?? 10}
                onChange={(e) => updateThreshold('gpsMeters', parseInt(e.target.value))}
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground">
                Capturar si movimiento &gt; {policy.changeThresholds?.gpsMeters ?? 10}m
              </p>
            </div>

            {/* Image Diff Threshold */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Imagen (%)
              </Label>
              <Input
                type="number"
                value={policy.changeThresholds?.imageDiffPercent ?? 5}
                onChange={(e) => updateThreshold('imageDiffPercent', parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Capturar si cambio &gt; {policy.changeThresholds?.imageDiffPercent ?? 5}%
              </p>
            </div>

            {/* Audio Level Threshold */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio (dB)
              </Label>
              <Input
                type="number"
                value={policy.changeThresholds?.audioLevelDelta ?? 10}
                onChange={(e) => updateThreshold('audioLevelDelta', parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Capturar si delta &gt; {policy.changeThresholds?.audioLevelDelta ?? 10}dB
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={loadPolicy} 
            disabled={loading || saving}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recargar
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
