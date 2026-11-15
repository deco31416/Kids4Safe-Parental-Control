
import { AlertTriangle, BookOpen, CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ScrollArea } from '@/components/ui/scroll-area';

interface ForensicGuideModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal educativo con guía de interpretación forense
 * Educar al analista/investigador sobre severidades, patterns y buenas prácticas
 */
export function ForensicGuideModal({ open, onClose }: ForensicGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-card border border-border text-foreground" aria-describedby="forensic-guide-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Guía de Interpretación Forense
          </DialogTitle>
          <DialogDescription id="forensic-guide-description" className="text-foreground opacity-60">
            Lineamientos técnicos para análisis de eventos de auditoría en contextos sensibles
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Sección 1: Severidades */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-foreground/80" />
                <h3 className="font-semibold text-lg">1. Niveles de Severidad</h3>
              </div>
              
              <div className="space-y-3 bg-muted bg-opacity-60 p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-red-500 bg-opacity-10 text-red-700 border border-red-500 border-opacity-30">
                        Crítico
                      </Badge>
                      <span className="text-sm font-medium">¿Qué es?</span>
                    </div>
                    <p className="text-sm text-foreground opacity-80 mb-2">
                      Evento que requiere revisión inmediata por su impacto potencial en la integridad de la sesión 
                      (ej: múltiples heartbeats perdidos, fallo de conexión WebRTC).
                    </p>
                    <p className="text-sm text-red-700 font-medium">
                      <AlertTriangle className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Crítico ≠ Fraude. Puede ser fallo técnico legítimo (VPN inestable, firewall corporativo,
                      red móvil degradada).
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-yellow-500 bg-opacity-10 text-yellow-700 border border-yellow-500 border-opacity-30">
                        Advertencia
                      </Badge>
                      <span className="text-sm font-medium">¿Qué es?</span>
                    </div>
                    <p className="text-sm text-foreground opacity-80">
                      Señal de comportamiento sospechoso o atípico que debe revisarse en contexto 
                      (ej: tab oculto frecuente, cierre anticipado de navegador, actividad de clipboard elevada).
                    </p>
                    <p className="text-sm text-yellow-700 font-medium mt-2">
                      <AlertTriangle className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Requiere correlación con otros eventos antes de concluir.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-foreground opacity-70 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-muted bg-opacity-40 text-foreground opacity-80 border border-border">
                        Info
                      </Badge>
                      <span className="text-sm font-medium">¿Qué es?</span>
                    </div>
                    <p className="text-sm text-foreground opacity-80">
                      Evento informativo que forma parte del comportamiento normal de la sesión 
                      (ej: tab recupera foco, track desmuteado rápido, conexión WebRTC exitosa).
                    </p>
                    <p className="text-sm text-foreground opacity-70 font-medium mt-2">
                      <CheckCircle2 className="inline-block h-4 w-4 shrink-0 align-middle text-emerald-600" aria-hidden="true" /> Útil para reconstruir timeline pero no indica anomalía.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Sección 2: Patterns Comunes */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-foreground/80" />
                <h3 className="font-semibold text-lg">2. Patterns de Eventos Comunes</h3>
              </div>
              
              <div className="space-y-3">
                <div className="bg-blue-500 bg-opacity-10 p-4 rounded-lg border border-blue-500 border-opacity-30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Badge variant="outline" className="bg-blue-500 bg-opacity-10 text-blue-700 border border-blue-500 border-opacity-30">
                        Pattern
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        TAB_HIDDEN + HEARTBEAT_DELAYED
                      </p>
                      <p className="text-sm text-foreground opacity-80 mb-2">
                        <span className="font-medium">Interpretación neutral:</span> Usuario cambió de tab/ventana 
                        temporalmente. Puede ser multitarea legítima (email, consulta de documentos) o distracción.
                      </p>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Acción recomendada:</span> Revisar duración y frecuencia. 
                        Si es &lt;30s ocasional → normal. Si es &gt;2min frecuente → investigar contexto.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500 bg-opacity-10 p-4 rounded-lg border border-orange-500 border-opacity-30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Badge variant="outline" className="bg-orange-500 bg-opacity-10 text-orange-700 border border-orange-500 border-opacity-30">
                        Pattern
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        WEBRTC_FAILED + Ubicación con VPN/Firewall
                      </p>
                      <p className="text-sm text-foreground opacity-80 mb-2">
                        <span className="font-medium">Interpretación neutral:</span> Fallo de conexión WebRTC por 
                        restricciones de red (firewall corporativo, VPN restrictiva, NAT simétrico).
                      </p>
                      <p className="text-sm text-orange-700">
                        <span className="font-medium">Acción recomendada:</span> Verificar IP/país. Si es red 
                        corporativa conocida → problema técnico legítimo. Ofrecer método alternativo si aplica.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500 bg-opacity-10 p-4 rounded-lg border border-red-500 border-opacity-30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Badge variant="outline" className="bg-red-500 bg-opacity-10 text-red-700 border border-red-500 border-opacity-30">
                        Pattern
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        TRACK_ENDED + BEFORE_UNLOAD &lt;5s
                      </p>
                      <p className="text-sm text-foreground opacity-80 mb-2">
                        <span className="font-medium">Interpretación neutral:</span> Desconexión de dispositivo 
                        seguida de cierre de navegador en menos de 5 segundos. Puede indicar ocultación deliberada 
                        o problema técnico (batería agotada, cierre accidental).
                      </p>
                      <p className="text-sm text-red-700">
                        <span className="font-medium">Acción recomendada:</span> <strong>Alta prioridad</strong>. 
                        Revisar timeline completo, sourceConfidence y contexto operativo antes de concluir.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary bg-opacity-10 p-4 rounded-lg border border-primary border-opacity-30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary border border-primary border-opacity-30">
                        Pattern
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        CLIPBOARD_COPY/PASTE frecuente (&gt;10 eventos)
                      </p>
                      <p className="text-sm text-foreground opacity-80 mb-2">
                        <span className="font-medium">Interpretación neutral:</span> Actividad de clipboard elevada. 
                        Puede ser workflow legítimo (copiar datos de documentos externos) o intento de exfiltración.
                      </p>
                      <p className="text-sm text-primary">
                        <span className="font-medium">Acción recomendada:</span> Correlacionar con tipo de sesión. 
                        Si es formulario complejo → normal. Si es examen supervisado → investigar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* Sección 3: Buenas Prácticas */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg text-green-700">3. Buenas Prácticas de Análisis</h3>
              </div>
              
              <div className="space-y-3 bg-green-500 bg-opacity-10 p-4 rounded-lg border border-green-500 border-opacity-30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">1️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Correlacionar eventos antes de concluir
                    </p>
                    <p className="text-sm text-foreground opacity-80">
                      Un evento aislado NO es suficiente. Revisar el timeline completo, identificar patterns 
                      y considerar el contexto operativo (tipo de sesión, políticas aplicadas, infraestructura).
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">2️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Revisar sourceConfidence de cada evento
                    </p>
                    <p className="text-sm text-foreground opacity-80">
                      <span className="font-medium">Alta confianza</span> (verde): señal directa del navegador/API. 
                      <span className="font-medium ml-2">Media</span> (azul): dato derivado de heurísticas. 
                      <span className="font-medium ml-2">Baja</span> (naranja): inferencia con ruido posible.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">3️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Evitar decisiones automáticas basadas solo en eventos
                    </p>
                    <p className="text-sm text-foreground opacity-80">
                      Los eventos forenses son <strong>indicadores técnicos</strong>, no pruebas jurídicas. 
                      Requieren análisis humano, contexto adicional y correlación con otras fuentes de datos 
                      (logs de aplicación, soporte técnico, reportes del usuario).
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">4️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Considerar falsos positivos y limitaciones técnicas
                    </p>
                    <p className="text-sm text-foreground opacity-80">
                      Ejemplos: SCREENSHOT_ATTEMPT solo detecta ciertos atajos (no captura de pantalla externa). 
                      HEARTBEAT_MISSED puede ser latencia de red legítima. TAB_HIDDEN puede ser cambio de ventana 
                      por notificación del sistema.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">5️⃣</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Documentar interpretaciones y decisiones
                    </p>
                    <p className="text-sm text-foreground opacity-80">
                      Mantener registro de análisis forense (qué eventos se revisaron, qué correlaciones se 
                      encontraron, qué decisión se tomó y por qué) para auditoría y transparencia.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer con disclaimer */}
            <div className="mt-6 p-4 bg-muted bg-opacity-60 rounded-lg border border-border">
              <p className="text-xs text-foreground opacity-70 leading-relaxed">
                <strong>Nota legal:</strong> Esta guía es de carácter técnico y educativo. No constituye 
                asesoramiento jurídico ni reemplaza el análisis caso por caso por parte de profesionales 
                cualificados. El uso de eventos forenses en contextos sensibles (exámenes supervisados, 
                procesos judiciales, auditorías corporativas) debe cumplir con las normativas locales 
                de privacidad y protección de datos (GDPR, LOPD, etc.).
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
