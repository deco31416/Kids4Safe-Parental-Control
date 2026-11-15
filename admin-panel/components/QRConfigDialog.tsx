"use client";

import { Camera as CameraIcon, Clock, Globe, Info, MapPin as MapPinIcon, Mic as MicIcon, Monitor as MonitorIcon, Plus, Save, Settings, Shield, X } from 'lucide-react';
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: QRConfig) => void;
  initialConfig?: QRConfig;
}

export interface QRConfig {
  name: string;
  redirect_url?: string;
  session_duration_max?: number;
  auto_redirect?: boolean;
  allowed_countries?: string[];
  require_camera?: boolean;
  require_microphone?: boolean;
  require_screen?: boolean;
  require_location?: boolean;
  policies?: {
    no_recording_countries?: string[];
    no_audio_countries?: string[];
    business_hours_only?: boolean;
    business_start_hour?: number;
    business_end_hour?: number;
    max_session_duration?: number;
  };
}

export default function QRConfigDialog({
  open,
  onClose,
  onSave,
  initialConfig,
}: QRConfigDialogProps) {
  const [config, setConfig] = useState<QRConfig>(
    initialConfig || {
      name: "",
      redirect_url: "",
      session_duration_max: 30000,
      auto_redirect: true,
      allowed_countries: [],
      require_camera: false,
      require_microphone: false,
      require_screen: false,
      require_location: false,
      policies: {
        business_hours_only: false,
        business_start_hour: 8,
        business_end_hour: 18,
      },
    },
  );

  const [allowedCountriesStr, setAllowedCountriesStr] = useState(
    config.allowed_countries?.join(", ") || "",
  );
  const [noRecordingCountriesStr, setNoRecordingCountriesStr] = useState(
    config.policies?.no_recording_countries?.join(", ") || "",
  );
  const [noAudioCountriesStr, setNoAudioCountriesStr] = useState(
    config.policies?.no_audio_countries?.join(", ") || "",
  );

  const handleSave = () => {
    const finalConfig = {
      ...config,
      allowed_countries: allowedCountriesStr
        ? allowedCountriesStr
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean)
        : [],
      policies: {
        ...config.policies,
        no_recording_countries: noRecordingCountriesStr
          ? noRecordingCountriesStr
              .split(",")
              .map((c) => c.trim().toUpperCase())
              .filter(Boolean)
          : [],
        no_audio_countries: noAudioCountriesStr
          ? noAudioCountriesStr
              .split(",")
              .map((c) => c.trim().toUpperCase())
              .filter(Boolean)
          : [],
      },
    };
    onSave(finalConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="qr-dialog-scroll max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-2xl font-bold">
            <Settings className="w-5 h-5 text-foreground" />
            Configuración Avanzada del QR
          </DialogTitle>
          <DialogDescription className="text-foreground/80">
            Configura el túnel invisible, políticas y permisos requeridos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Info className="w-4 h-4 text-foreground/80" />
              Información Básica
            </div>

            <div>
              <Label htmlFor="name" className="text-foreground/80">
                Nombre del QR
              </Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Ejemplo: Mesa 5 - Restaurante"
              />
            </div>
          </div>

          {/* Túnel Invisible */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Globe className="w-4 h-4 text-foreground/80" />
              Túnel Invisible (Redirect)
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertDescription className="text-xs text-blue-700">
                El usuario verá el contenido de esta URL en pantalla completa,
                con el monitoreo activo de forma continua.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="redirect-url" className="text-foreground/80">
                URL de Destino
              </Label>
              <Input
                id="redirect-url"
                type="url"
                value={config.redirect_url || ""}
                onChange={(e) =>
                  setConfig({ ...config, redirect_url: e.target.value })
                }
                placeholder="https://restaurante.com/menu"
              />
              <p className="text-xs text-foreground/80 mt-1">
                El campo NO debe quedar vacío. De lo contrario, el sistema no
                abrirá una ventana independiente para el monitoreo
                desapercibido.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-redirect" className="text-foreground/80">
                  Auto-redirigir después de permisos
                </Label>
                <p className="text-xs text-foreground/80">
                  Redirige automáticamente al contenido una vez se otorguen los
                  permisos
                </p>
              </div>
              <Switch
                id="auto-redirect"
                checked={config.auto_redirect}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, auto_redirect: checked })
                }
              />
            </div>
          </div>

          {/* Permisos Requeridos */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Shield className="w-4 h-4 text-foreground/80" />
              Permisos Requeridos
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/60 border border-border rounded">
                <Label htmlFor="require-camera" className="text-sm text-foreground/80">
                  <CameraIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Cámara
                </Label>
                <Switch
                  id="require-camera"
                  checked={config.require_camera}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, require_camera: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/60 border border-border rounded">
                <Label htmlFor="require-microphone" className="text-sm text-foreground/80">
                  <MicIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Micrófono
                </Label>
                <Switch
                  id="require-microphone"
                  checked={config.require_microphone}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, require_microphone: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/60 border border-border rounded">
                <Label htmlFor="require-screen" className="text-sm text-foreground/80">
                  <MonitorIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Pantalla
                </Label>
                <Switch
                  id="require-screen"
                  checked={config.require_screen}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, require_screen: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/60 border border-border rounded">
                <Label htmlFor="require-location" className="text-sm text-foreground/80">
                  <MapPinIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Ubicación
                </Label>
                <Switch
                  id="require-location"
                  checked={config.require_location}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, require_location: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Políticas de Acceso */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Clock className="w-4 h-4 text-foreground/80" />
              Políticas y Restricciones
            </div>

            <div>
              <Label htmlFor="session-duration" className="text-foreground/80">
                Duración máxima de sesión (minutos)
              </Label>
              <Input
                id="session-duration"
                type="number"
                value={config.session_duration_max || ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    session_duration_max: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="30000"
              />
            </div>

            <div>
              <Label htmlFor="allowed-countries" className="text-foreground/80">
                Países permitidos (ISO codes)
              </Label>
              <Input
                id="allowed-countries"
                value={allowedCountriesStr}
                onChange={(e) => setAllowedCountriesStr(e.target.value)}
                placeholder="CO, US, MX"
              />
              <p className="text-xs text-foreground/80 mt-1">
                Separados por comas. Deja vacío para permitir todos
              </p>
            </div>

            <div>
              <Label htmlFor="no-recording-countries" className="text-foreground/80">
                Países donde NO se permite grabación
              </Label>
              <Input
                id="no-recording-countries"
                value={noRecordingCountriesStr}
                onChange={(e) => setNoRecordingCountriesStr(e.target.value)}
                placeholder="DE, FR"
              />
              <p className="text-xs text-foreground/80 mt-1">
                Por regulaciones GDPR u otras leyes locales
              </p>
            </div>

            <div>
              <Label htmlFor="no-audio-countries" className="text-foreground/80">
                Países donde NO se permite audio
              </Label>
              <Input
                id="no-audio-countries"
                value={noAudioCountriesStr}
                onChange={(e) => setNoAudioCountriesStr(e.target.value)}
                placeholder="CA"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="business-hours" className="text-foreground/80">
                  Solo horario comercial
                </Label>
                <p className="text-xs text-foreground/80">
                  Restringir acceso a horas laborales
                </p>
              </div>
              <Switch
                id="business-hours"
                checked={config.policies?.business_hours_only}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    policies: {
                      ...config.policies,
                      business_hours_only: checked,
                    },
                  })
                }
              />
            </div>

            {config.policies?.business_hours_only && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:pl-6">
                <div>
                  <Label htmlFor="start-hour" className="text-foreground/80">
                    Hora inicio
                  </Label>
                  <Input
                    id="start-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={config.policies?.business_start_hour || 8}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        policies: {
                          ...config.policies,
                          business_start_hour: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end-hour" className="text-foreground/80">
                    Hora fin
                  </Label>
                  <Input
                    id="end-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={config.policies?.business_end_hour || 18}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        policies: {
                          ...config.policies,
                          business_end_hour: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-lg border border-border bg-card text-foreground hover:bg-muted"
            onClick={onClose}
          >
            Cancelar
            <X className="ml-2 h-4 w-4" />
          </Button>
          <Button
            className="rounded-lg border-2 border-blue-500 text-primary-foreground bg-blue-600 hover:bg-blue-700 hover:border-blue-600 hover:text-primary-foreground"
            onClick={handleSave}
            disabled={!config.name.trim()}
          >
            {initialConfig ? "Actualizar" : "Crear"} QR
            {initialConfig ? (
              <Save className="ml-2 h-4 w-4" />
            ) : (
              <Plus className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
