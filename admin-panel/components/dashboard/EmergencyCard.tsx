'use client';
import { useState } from 'react';
import type { ActiveSession } from '@/lib/admin-api';
import { Clock, Eye, EyeOff, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export interface EmergencyActions {
 onView: (id: string) => void; onScreen: (id: string) => void; onAudio: (id: string) => void; onLive: (id: string) => void; onDelete: (session: ActiveSession) => void;
}
export function EmergencyCard({session, onView: handleViewSession, onScreen: handleViewScreen, onAudio: handleViewAudio, onLive: handleViewLive, onDelete: handleDeleteEmergency}: EmergencyActions & {session: ActiveSession}) {
const [coordinatesVisible, setCoordinatesVisible] = useState(false);
const createdAt = session.createdAt ? new Date(session.createdAt) : undefined;
                    const endedAt = session.endTime ? new Date(session.endTime) : undefined;
                    const isActive = session.status === 'active';
                    const location = session.location;
                    const coordinates = (location as any)?.lat != null && (location as any)?.lng != null
                      ? `${Number((location as any).lat).toFixed(5)}, ${Number((location as any).lng).toFixed(5)}`
                      : (location as any)?.latitude != null && (location as any)?.longitude != null
                        ? `${Number((location as any).latitude).toFixed(5)}, ${Number((location as any).longitude).toFixed(5)}`
                        : null;

                    return (
                      <div className="kids-session-card min-w-0 rounded-lg border border-border bg-card p-3 text-foreground sm:p-4">
                        <div className="flex min-w-0 flex-col items-start justify-between gap-3 min-[400px]:flex-row">
                          <div>
                            <p className="text-sm font-semibold">{session.mobile?.deviceLabel || 'Kids4Safe Mobile'}</p>
                            <p className="mt-1 break-all text-xs text-foreground/55">{session.mobile?.unitId || session.qrId}</p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1 text-xs font-semibold ${isActive ? 'bg-red-500/15 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                            {isActive ? 'Auxilio activo' : 'Finalizado'}
                          </span>
                        </div>
                        <div className="kids-session-details mt-4 grid min-w-0 gap-2 text-sm text-foreground/75">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-foreground/45"><Clock className="h-3.5 w-3.5" /> Inicio</span>
                            <span className="text-right">{createdAt ? createdAt.toLocaleString() : 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-foreground/45"><Clock className="h-3.5 w-3.5" /> Fin</span>
                            <span className="text-right">{endedAt ? endedAt.toLocaleString() : isActive ? 'En curso' : 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-foreground/45"><MapPin className="h-3.5 w-3.5" /> GPS</span>
                            <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                              <span className="break-words" aria-live="polite">{coordinates ? coordinatesVisible ? coordinates : 'Coordenadas ocultas' : 'Sin ubicación'}</span>
                              {coordinates && <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-primary" aria-label={coordinatesVisible ? 'Ocultar coordenadas' : 'Mostrar coordenadas'} title={coordinatesVisible ? 'Ocultar coordenadas' : 'Mostrar coordenadas'} aria-pressed={coordinatesVisible} onClick={() => setCoordinatesVisible(visible => !visible)}>
                                {coordinatesVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                              </Button>}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-w-fit border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/25 hover:text-foreground"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {isActive ? 'Terminar y eliminar' : 'Eliminar'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border bg-card text-foreground">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">
                                  {isActive ? '¿Terminar y eliminar auxilio?' : '¿Eliminar registro de auxilio?'}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-foreground/70">
                                  Esta acción elimina el registro de MongoDB y borra la evidencia asociada: capturas, audio, tracking y archivos de los volúmenes.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmergency(session)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Eliminar evidencia
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-fit border-border bg-card text-foreground"
                            onClick={() => handleViewSession(session.sessionId)}
                          >
                            Ver detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-fit border-border bg-card text-foreground"
                            onClick={() => handleViewScreen(session.sessionId)}
                          >
                            Capturas
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-fit border-border bg-card text-foreground"
                            onClick={() => handleViewAudio(session.sessionId)}
                          >
                            Audio
                          </Button>
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-w-fit border-red-500/30 bg-red-500/10 text-red-700"
                              onClick={() => handleViewLive(session.sessionId)}
                            >
                              En vivo
                            </Button>
                          )}
                        </div>
                      </div>
                    );
}
